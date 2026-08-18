import React, { useEffect, useRef } from "react";

export default function Spark({ bars }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const draw = () => {
      const w = parent.clientWidth;
      const h = 56;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0a0f0c";
      ctx.fillRect(0, 0, w, h);

      if (!bars?.length) {
        ctx.fillStyle = "#6d7a70";
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText("syncing tape…", w / 2, h / 2 + 3);
        return;
      }

      const closes = bars.map((b) => b.c).filter((n) => n > 0);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const span = Math.max(max - min, min * 0.0001);
      const up = closes[closes.length - 1] >= closes[0];
      ctx.beginPath();
      ctx.strokeStyle = up ? "#31d66d" : "#d34d55";
      ctx.lineWidth = 1.4;
      closes.forEach((c, i) => {
        const x = 4 + (i / Math.max(closes.length - 1, 1)) * (w - 8);
        const y = h - 6 - ((c - min) / span) * (h - 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [bars]);

  return (
    <div className="spark">
      <div className="sparkHead">
        <span>LIVE TAPE · 1H</span>
        <b>{bars?.length ? `${bars.length} bars` : "—"}</b>
      </div>
      <canvas ref={ref} />
    </div>
  );
}
