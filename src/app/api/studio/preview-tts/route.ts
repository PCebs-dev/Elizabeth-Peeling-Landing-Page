import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, verifySessionToken } from "@/lib/studio/auth";
import {
  isOpenAiTtsConfigured,
  synthesizeStudioVoiceover,
} from "@/lib/studio/tts";
import { parseStudioTtsVoice } from "@/lib/studio/tts-voices";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/studio/preview-tts
 * JSON: { script, voice?, language? }
 * Returns audio/mpeg so prep can preview the voice before generating video.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenAiTtsConfigured()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is required to preview voices. Add it to .env.local.",
      },
      { status: 503 }
    );
  }

  let script = "";
  let voiceRaw: unknown;
  let language: "en" | "fr" = "en";

  try {
    const body = (await request.json()) as Record<string, unknown>;
    script = typeof body.script === "string" ? body.script : "";
    voiceRaw = body.voice;
    language = body.language === "fr" ? "fr" : "en";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!script.trim()) {
    return NextResponse.json(
      { error: "Add a spoken script before testing a voice." },
      { status: 400 }
    );
  }

  const voice = parseStudioTtsVoice(voiceRaw);

  try {
    const audio = await synthesizeStudioVoiceover({
      script,
      language,
      voice,
      // Keep previews snappy / cheaper while still representative
      maxChars: 800,
    });

    return new NextResponse(new Uint8Array(audio.bytes), {
      status: 200,
      headers: {
        "Content-Type": audio.mimeType,
        "Cache-Control": "no-store",
        "X-Studio-Voice": encodeURIComponent(audio.voice),
        "X-Studio-Tts-Model": encodeURIComponent(audio.model),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Voice preview failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
