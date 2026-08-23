"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImageCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: ImageCompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX != null) updateFromClientX(clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[rgb(var(--brand-200))] select-none touch-none"
      onMouseDown={(e) => {
        dragging.current = true;
        updateFromClientX(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        const x = e.touches[0]?.clientX;
        if (x != null) updateFromClientX(x);
      }}
    >
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeSrc} alt={beforeLabel} className="h-full w-full object-cover" />
      </div>
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-md"
        style={{ left: `${position}%` }}
        aria-hidden
      />
      <div
        className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[rgb(var(--brand-800))] text-white shadow-lg"
        style={{ left: `${position}%` }}
        role="slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Compare before and after"
      >
        ↔
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
        {beforeLabel}
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
        {afterLabel}
      </span>
    </div>
  );
}
