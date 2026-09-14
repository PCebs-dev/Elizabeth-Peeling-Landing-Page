import path from "path";

/** Writable studio data root. On Vercel only /tmp is writable (ephemeral). */
export function studioDataDir(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "studio");
  }
  return path.join(process.cwd(), "data", "studio");
}

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}
