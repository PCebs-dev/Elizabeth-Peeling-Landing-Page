/**
 * Mux OpenAI TTS audio onto a silent Higgsfield MP4 (V1 voiceover).
 *
 * Resolution order: FFMPEG_PATH / FFMPEG_PATH, ffmpeg on PATH, then the
 * `ffmpeg-static` binary bundled for Vercel Linux (and local Windows).
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { gunzipSync } from "node:zlib";

let cachedFfmpeg: string | null | undefined;

function whichCommand(): string {
  return process.platform === "win32" ? "where" : "which";
}

async function runCapture(
  cmd: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** Resolve ffmpeg binary once per process. */
export async function resolveFfmpegPath(): Promise<string | null> {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg;

  const fromEnv =
    process.env.FFMPEG_PATH?.trim() || process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    cachedFfmpeg = fromEnv;
    return cachedFfmpeg;
  }

  const probe = await runCapture(whichCommand(), ["ffmpeg"]);
  if (probe.code === 0) {
    const first = probe.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    if (first) {
      cachedFfmpeg = first;
      return cachedFfmpeg;
    }
  }

  try {
    const require = createRequire(import.meta.url);
    const staticPath = require("ffmpeg-static") as string | null;
    if (staticPath) {
      if (process.platform !== "win32") {
        await fs.chmod(staticPath, 0o755).catch(() => undefined);
      }
      cachedFfmpeg = staticPath;
      return cachedFfmpeg;
    }
  } catch {
    /* package missing or not traced */
  }

  const bundled = join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );
  try {
    await fs.access(bundled);
    if (process.platform !== "win32") {
      await fs.chmod(bundled, 0o755).catch(() => undefined);
    }
    cachedFfmpeg = bundled;
    return cachedFfmpeg;
  } catch {
    /* not on disk — Vercel often skips ffmpeg-static's install script */
  }

  const downloaded = await downloadFfmpegStaticToTmp();
  if (downloaded) {
    cachedFfmpeg = downloaded;
    return cachedFfmpeg;
  }

  cachedFfmpeg = null;
  return null;
}

/** ffmpeg-static install is blocked on Vercel; fetch the Linux binary into /tmp. */
async function downloadFfmpegStaticToTmp(): Promise<string | null> {
  if (process.platform !== "linux") return null;
  const dest = join(tmpdir(), "studio-ffmpeg");
  try {
    await fs.access(dest);
    return dest;
  } catch {
    /* download */
  }
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-${arch}.gz`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "elizabeth-studio-ffmpeg" },
    });
    if (!res.ok) return null;
    const gz = Buffer.from(await res.arrayBuffer());
    const bin = gunzipSync(gz);
    await fs.writeFile(dest, bin, { mode: 0o755 });
    await fs.chmod(dest, 0o755);
    return dest;
  } catch {
    return null;
  }
}

export async function isFfmpegAvailable(): Promise<boolean> {
  return Boolean(await resolveFfmpegPath());
}

export function ffmpegInstallHint(): string {
  return (
    "V1 voiceover could not get ffmpeg (bundled binary or download). " +
    "Retry once; locally you can install ffmpeg or set FFMPEG_PATH. " +
    "Silent motion-only videos work without ffmpeg."
  );
}

/**
 * Copy video stream and replace/add audio with AAC from MP3 TTS.
 * Uses -shortest so the clip ends when the shorter of video/audio ends.
 */
export async function muxVoiceoverOntoVideo(params: {
  videoBytes: Buffer;
  audioBytes: Buffer;
}): Promise<Buffer> {
  const ffmpeg = await resolveFfmpegPath();
  if (!ffmpeg) {
    throw new Error(ffmpegInstallHint());
  }

  const id = randomBytes(8).toString("hex");
  const dir = join(tmpdir(), `studio-vo-${id}`);
  const videoPath = join(dir, "in.mp4");
  const audioPath = join(dir, "vo.mp3");
  const outPath = join(dir, "out.mp4");

  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(videoPath, params.videoBytes);
    await fs.writeFile(audioPath, params.audioBytes);

    const args = [
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      "-movflags",
      "+faststart",
      outPath,
    ];

    const result = await runCapture(ffmpeg, args);
    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).slice(-500);
      throw new Error(
        `ffmpeg mux failed (exit ${result.code}): ${detail || "no output"}`
      );
    }

    const out = await fs.readFile(outPath);
    if (!out.length) {
      throw new Error("ffmpeg mux produced an empty MP4");
    }
    return out;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
