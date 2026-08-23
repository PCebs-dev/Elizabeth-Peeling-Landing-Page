import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import { getMetaConfig } from "@/lib/studio/meta-publish";
import { isHiggsfieldConfigured } from "@/lib/studio/generate-video";
import { isSyncLabsConfigured } from "@/lib/studio/sync-lipsync";

export const runtime = "nodejs";
export const maxDuration = 60;

type CheckResult = {
  present: boolean;
  ok: boolean;
  detail: string;
};

function present(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

async function checkOpenAI(): Promise<CheckResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  if (!apiKey) {
    return { present: false, ok: false, detail: "OPENAI_API_KEY missing" };
  }

  // Chat/completions auth check (cheap)
  const modelsRes = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!modelsRes.ok) {
    const text = (await modelsRes.text()).slice(0, 180);
    return {
      present: true,
      ok: false,
      detail: `models ${modelsRes.status}: ${text}`,
    };
  }

  // Image model access check — tiny prompt, low cost, proves image billing/access
  const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: imageModel,
      prompt: "solid light gray square, abstract, no text",
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!imgRes.ok) {
    const text = (await imgRes.text()).slice(0, 240);
    // Fall back through known models if preferred fails
    const fallbacks = ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"].filter(
      (m) => m !== imageModel
    );
    for (const model of fallbacks) {
      const retry = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: "solid light gray square, abstract, no text",
          n: 1,
          size: "1024x1024",
        }),
      });
      if (retry.ok) {
        return {
          present: true,
          ok: true,
          detail: `${imageModel} failed; ${model} works`,
        };
      }
    }
    return {
      present: true,
      ok: false,
      detail: `${imageModel} ${imgRes.status}: ${text}`,
    };
  }

  return {
    present: true,
    ok: true,
    detail: `chat + image (${imageModel}) ok`,
  };
}

async function checkMeta(): Promise<CheckResult> {
  const cfg = getMetaConfig();
  if (!cfg.token || !cfg.pageId) {
    return {
      present: false,
      ok: false,
      detail: `missing: ${[
        !cfg.pageId ? "META_PAGE_ID" : null,
        !cfg.token ? "META_PAGE_ACCESS_TOKEN" : null,
        !cfg.igUserId ? "META_IG_USER_ID" : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
    };
  }

  // Page tokens resolve /me to the Page — works with publish scopes
  // (unlike fields=name which needs pages_read_engagement).
  const meUrl = `https://graph.facebook.com/${cfg.graphVersion}/me?fields=id&access_token=${encodeURIComponent(cfg.token)}`;
  const meRes = await fetch(meUrl);
  const meData = (await meRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!meRes.ok || meData.error || !meData.id) {
    return {
      present: true,
      ok: false,
      detail: meData.error?.message || `token /me failed (${meRes.status})`,
    };
  }

  if (meData.id !== cfg.pageId) {
    return {
      present: true,
      ok: false,
      detail: `token page ${meData.id} does not match META_PAGE_ID`,
    };
  }

  if (cfg.igUserId) {
    const igUrl = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.igUserId}?fields=id&access_token=${encodeURIComponent(cfg.token)}`;
    const igRes = await fetch(igUrl);
    const igData = (await igRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!igRes.ok || igData.error) {
      return {
        present: true,
        ok: false,
        detail: `page ok; IG failed: ${igData.error?.message || igRes.status}`,
      };
    }
    return {
      present: true,
      ok: true,
      detail: "page token + IG account ok",
    };
  }

  return {
    present: true,
    ok: true,
    detail: "page token ok (META_IG_USER_ID not set)",
  };
}

async function checkHiggsfield(): Promise<CheckResult> {
  if (!isHiggsfieldConfigured()) {
    return {
      present: false,
      ok: false,
      detail: "HIGGSFIELD_API_KEY_ID/SECRET missing",
    };
  }
  const id = process.env.HIGGSFIELD_API_KEY_ID!.trim();
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET!.trim();
  const res = await fetch(
    "https://platform.higgsfield.ai/files/generate-upload-url",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${id}:${secret}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content_type: "image/png" }),
    }
  );
  if (!res.ok) {
    const text = (await res.text()).slice(0, 180);
    return {
      present: true,
      ok: false,
      detail: `${res.status}: ${text}`,
    };
  }
  return { present: true, ok: true, detail: "upload-url auth ok" };
}

async function checkSync(): Promise<CheckResult> {
  if (!isSyncLabsConfigured()) {
    return { present: false, ok: false, detail: "SYNC_API_KEY missing" };
  }
  const key = process.env.SYNC_API_KEY!.trim();
  // Invalid generate body — 401/403 means bad key; 400/422 means key accepted
  const res = await fetch("https://api.sync.so/v2/generate", {
    method: "POST",
    headers: {
      "x-api-key": key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (res.status === 401 || res.status === 403) {
    const text = (await res.text()).slice(0, 180);
    return {
      present: true,
      ok: false,
      detail: `auth rejected (${res.status}): ${text}`,
    };
  }
  return {
    present: true,
    ok: true,
    detail: `auth accepted (${res.status})`,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [openai, meta, higgsfield, sync] = await Promise.all([
    checkOpenAI(),
    checkMeta(),
    checkHiggsfield(),
    checkSync(),
  ]);

  const studioPassword = present(process.env.STUDIO_PASSWORD);
  const cronSecret = present(process.env.CRON_SECRET);

  const checks = {
    STUDIO_PASSWORD: {
      present: studioPassword,
      ok: studioPassword,
      detail: studioPassword ? "set" : "missing",
    },
    CRON_SECRET: {
      present: cronSecret,
      ok: cronSecret,
      detail: cronSecret ? "set" : "missing",
    },
    OPENAI_API_KEY: openai,
    META: meta,
    HIGGSFIELD: higgsfield,
    SYNC_API_KEY: sync,
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    ok: allOk,
    host: "vercel-runtime",
    checks,
  });
}
