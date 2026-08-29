"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export type EnhanceTool = "point" | "circle";

export type EnhanceRegion = {
  id: string;
  kind: EnhanceTool;
  /** Center X as 0–1 of image width */
  cx: number;
  cy: number;
  /** Radius X as 0–1 of image width */
  rx: number;
  ry: number;
  note: string;
};

interface EnhanceCanvasProps {
  imageUrl: string;
  regions: EnhanceRegion[];
  tool: EnhanceTool;
  disabled?: boolean;
  onRegionsChange: (regions: EnhanceRegion[]) => void;
}

type DraftEllipse = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function pointRadius(displayW: number, displayH: number): { rx: number; ry: number } {
  const pixelR = 0.07 * Math.min(displayW, displayH);
  return {
    rx: pixelR / Math.max(displayW, 1),
    ry: pixelR / Math.max(displayH, 1),
  };
}

function drawRegion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  region: Pick<EnhanceRegion, "cx" | "cy" | "rx" | "ry">,
  index: number | null,
  draft: boolean
) {
  const x = region.cx * width;
  const y = region.cy * height;
  const rx = Math.max(4, region.rx * width);
  const ry = Math.max(4, region.ry * height);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = draft ? "rgba(180, 120, 40, 0.22)" : "rgba(180, 120, 40, 0.32)";
  ctx.fill();
  ctx.strokeStyle = "rgba(89, 84, 72, 0.95)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (index !== null) {
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillStyle = "rgb(89, 84, 72)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), x, y);
  }
}

export async function renderEnhanceMaskPng(
  width: number,
  height: number,
  regions: EnhanceRegion[]
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create mask canvas");
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0,0,0,1)";
  for (const region of regions) {
    ctx.beginPath();
    ctx.ellipse(
      region.cx * canvas.width,
      region.cy * canvas.height,
      Math.max(2, region.rx * canvas.width),
      Math.max(2, region.ry * canvas.height),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Could not export mask");
  return blob;
}

export function EnhanceCanvas({
  imageUrl,
  regions,
  tool,
  disabled = false,
  onRegionsChange,
}: EnhanceCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [draft, setDraft] = useState<DraftEllipse | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const rect = img.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    regions.forEach((region, i) =>
      drawRegion(ctx, width, height, region, i, false)
    );
    if (draft) {
      drawRegion(ctx, width, height, draft, null, true);
    }
  }, [draft, regions]);

  useEffect(() => {
    redraw();
  }, [redraw, imageUrl]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  function toNorm(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    const pos = toNorm(e.clientX, e.clientY);
    if (!pos) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: pos.x,
      startY: pos.y,
      pointerId: e.pointerId,
    };
    if (tool === "circle") {
      setDraft({ cx: pos.x, cy: pos.y, rx: 0.01, ry: 0.01 });
    }
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled || !dragRef.current) return;
    const pos = toNorm(e.clientX, e.clientY);
    if (!pos) return;
    const { startX, startY } = dragRef.current;
    if (tool === "circle") {
      setDraft({
        cx: (startX + pos.x) / 2,
        cy: (startY + pos.y) / 2,
        rx: Math.abs(pos.x - startX) / 2,
        ry: Math.abs(pos.y - startY) / 2,
      });
    }
  }

  function commitPoint(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = pointRadius(canvas.width, canvas.height);
    onRegionsChange([
      ...regions,
      {
        id: crypto.randomUUID(),
        kind: "point",
        cx: x,
        cy: y,
        rx: r.rx,
        ry: r.ry,
        note: "",
      },
    ]);
  }

  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled || !dragRef.current) return;
    const start = dragRef.current;
    dragRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const pos = toNorm(e.clientX, e.clientY) ?? {
      x: start.startX,
      y: start.startY,
    };
    const dx = Math.abs(pos.x - start.startX);
    const dy = Math.abs(pos.y - start.startY);
    setDraft(null);

    if (tool === "point" || (dx < 0.012 && dy < 0.012)) {
      commitPoint(start.startX, start.startY);
      return;
    }

    onRegionsChange([
      ...regions,
      {
        id: crypto.randomUUID(),
        kind: "circle",
        cx: (start.startX + pos.x) / 2,
        cy: (start.startY + pos.y) / 2,
        rx: Math.max(0.015, dx / 2),
        ry: Math.max(0.015, dy / 2),
        note: "",
      },
    ]);
  }

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-xl bg-[rgb(var(--brand-100))]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Photo to enhance"
        draggable={false}
        onLoad={redraw}
        className="block h-auto w-full select-none"
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none ${
          disabled ? "cursor-wait" : "cursor-crosshair"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDraft(null);
        }}
      />
    </div>
  );
}
