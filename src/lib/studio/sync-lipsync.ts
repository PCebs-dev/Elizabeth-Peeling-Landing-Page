/**
 * Sync Labs lip-sync / talking-head for V2 studio video.
 * Docs: https://sync.so/docs/api-reference.md
 *
 * Pipeline: silent Higgsfield MP4 + OpenAI TTS audio → Sync lipsync → spoken face.
 */

const SYNC_BASE = "https://api.sync.so";

/** Cost-efficient lip sync; override with SYNC_MODEL (e.g. react-1, lipsync-2-pro) */
const DEFAULT_SYNC_MODEL = "lipsync-2";

export function isSyncLabsConfigured(): boolean {
  return Boolean(process.env.SYNC_API_KEY?.trim());
}

function syncApiKey(): string {
  return process.env.SYNC_API_KEY?.trim() || "";
}

function syncModel(): string {
  return (process.env.SYNC_MODEL?.trim() || DEFAULT_SYNC_MODEL).replace(
    /^\/+/,
    ""
  );
}

type SyncStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

type SyncGeneration = {
  id: string;
  status: SyncStatus;
  error?: string;
  errorCode?: string;
  outputUrl?: string;
  outputDuration?: number;
  model?: string;
};

function syncHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "x-api-key": syncApiKey(),
    Accept: "application/json",
    "User-Agent": "ElizabethDentalStudio/1.0",
    ...extra,
  };
}

function buildSyncOptions(model: string): string {
  const options: Record<string, unknown> = {
    // Prefer trimming longer audio to the motion clip rather than looping faces
    sync_mode: "cut_off",
  };
  // react-1 supports expressive head motion for a stronger “talking head” look
  if (model === "react-1") {
    options.model_mode = "head";
    options.temperature = 0.45;
  }
  return JSON.stringify(options);
}

async function pollSyncGeneration(
  id: string,
  maxWaitMs = 600_000
): Promise<SyncGeneration> {
  const start = Date.now();
  let delay = 2000;

  while (Date.now() - start < maxWaitMs) {
    const url = new URL(`${SYNC_BASE}/v2/generate/${id}`);
    url.searchParams.set("wait", "true");
    url.searchParams.set("timeout", "10");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: syncHeaders(),
    });
    const text = await res.text();
    let data: SyncGeneration;
    try {
      data = JSON.parse(text) as SyncGeneration;
    } catch {
      throw new Error(
        `Sync Labs status parse failed (${res.status}): ${text.slice(0, 300)}`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Sync Labs status failed (${res.status}): ${
          data.error || text.slice(0, 300)
        }`
      );
    }

    if (data.status === "COMPLETED") {
      if (!data.outputUrl) {
        throw new Error(
          `Sync Labs completed but returned no outputUrl (id=${id})`
        );
      }
      return data;
    }

    if (data.status === "FAILED" || data.status === "REJECTED") {
      throw new Error(
        `Sync Labs generation ${data.status}: ${
          data.error || data.errorCode || "no details"
        } (id=${id})`
      );
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 1000, 8000);
  }

  throw new Error(
    `Sync Labs lip-sync timed out after ~${Math.round(
      maxWaitMs / 60_000
    )} minutes (id=${id}). Check the job at https://sync.so/`
  );
}

/**
 * Lip-sync a silent motion clip to spoken audio via Sync Labs.
 * Files must be under 20MB each (fine for short social clips).
 */
export async function generateSyncTalkingHead(params: {
  videoBytes: Buffer | Uint8Array;
  audioBytes: Buffer | Uint8Array;
  videoMimeType?: string;
  audioMimeType?: string;
}): Promise<{
  bytes: Buffer;
  mimeType: string;
  model: string;
  provider: "sync-labs";
  generationId: string;
  outputDuration?: number;
}> {
  if (!isSyncLabsConfigured()) {
    throw new Error(
      "Sync Labs is not configured. Add SYNC_API_KEY to .env.local (https://sync.so/settings/api-keys)."
    );
  }

  const videoBuf = Buffer.from(params.videoBytes);
  const audioBuf = Buffer.from(params.audioBytes);
  if (!videoBuf.length) throw new Error("Sync Labs: empty video input");
  if (!audioBuf.length) throw new Error("Sync Labs: empty audio input");

  const maxBytes = 20 * 1024 * 1024;
  if (videoBuf.length > maxBytes || audioBuf.length > maxBytes) {
    throw new Error(
      "Sync Labs direct upload limit is 20MB per file — shorten the clip or compress media."
    );
  }

  const model = syncModel();
  const form = new FormData();
  form.append("model", model);
  form.append("options", buildSyncOptions(model));
  form.append("outputFileName", `studio-v2-${Date.now()}`);
  form.append(
    "video",
    new Blob([new Uint8Array(videoBuf)], {
      type: params.videoMimeType || "video/mp4",
    }),
    "motion.mp4"
  );
  form.append(
    "audio",
    new Blob([new Uint8Array(audioBuf)], {
      type: params.audioMimeType || "audio/mpeg",
    }),
    "voice.mp3"
  );

  const submit = await fetch(`${SYNC_BASE}/v2/generate`, {
    method: "POST",
    headers: syncHeaders(),
    body: form,
  });

  const submitText = await submit.text();
  let queued: SyncGeneration;
  try {
    queued = JSON.parse(submitText) as SyncGeneration;
  } catch {
    throw new Error(
      `Sync Labs submit failed (${submit.status}): ${submitText.slice(0, 400)}`
    );
  }

  if (!submit.ok || !queued.id) {
    const detail =
      queued.error ||
      (queued as { detail?: string }).detail ||
      submitText.slice(0, 400);
    if (submit.status === 401) {
      throw new Error(
        "Sync Labs API key invalid — check SYNC_API_KEY at https://sync.so/settings/api-keys"
      );
    }
    if (submit.status === 402) {
      throw new Error(
        "Sync Labs plan/credits required — upgrade or add credits at https://sync.so/"
      );
    }
    throw new Error(`Sync Labs submit failed (${submit.status}): ${detail}`);
  }

  const done = await pollSyncGeneration(queued.id);
  const videoRes = await fetch(done.outputUrl!);
  if (!videoRes.ok) {
    throw new Error(
      `Failed to download Sync Labs output (${videoRes.status}) id=${done.id}`
    );
  }

  const out = Buffer.from(await videoRes.arrayBuffer());
  if (!out.length) {
    throw new Error(`Sync Labs returned empty video (id=${done.id})`);
  }

  const mime =
    videoRes.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

  return {
    bytes: out,
    mimeType: mime,
    model: done.model || model,
    provider: "sync-labs",
    generationId: done.id,
    outputDuration: done.outputDuration,
  };
}
