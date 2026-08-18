import React, { useEffect, useRef } from "react";
import { money } from "../lib/format.js";

export default function DepthXray({ book, symbol }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const draw = () => {
      const w = parent.clientWidth;
      const h = Math.max(110, Math.min(168, parent.clientHeight || 168));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "#0c110e";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#1c2a20";
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

      const midX = w * 0.5;
      ctx.strokeStyle = "#2a3d30";
      ctx.beginPath();
      ctx.moveTo(midX, 8);
      ctx.lineTo(midX, h - 8);
      ctx.stroke();

      if (!book) {
        ctx.fillStyle = "#6d7a70";
        ctx.font = "11px IBM Plex Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for public book…", w / 2, h / 2);
        return;
      }

      const levels = 14;
      const bids = book.bids.slice(0, levels);
      const asks = book.asks.slice(0, levels);
      const maxUsd = Math.max(
        1,
        ...bids.map(([p, q]) => p * q),
        ...asks.map(([p, q]) => p * q)
      );
      const rowH = (h - 20) / levels;
      const maxBar = midX - 18;

      asks.forEach((row, i) => {
        const usd = row[0] * row[1];
        const bw = (usd / maxUsd) * maxBar;
        const y = 10 + i * rowH;
        const wall = book.askWall && Math.abs(row[0] - book.askWall.price) < 1e-9;
        ctx.fillStyle = wall ? "rgba(211,77,85,0.45)" : "rgba(211,77,85,0.22)";
        ctx.fillRect(midX + 4, y, bw, rowH - 3);
        ctx.fillStyle = "#d34d55";
        ctx.fillRect(midX + 4, y, wall ? 4 : 2, rowH - 3);
      });

      bids.forEach((row, i) => {
        const usd = row[0] * row[1];
        const bw = (usd / maxUsd) * maxBar;
        const y = 10 + i * rowH;
        const wall = book.bidWall && Math.abs(row[0] - book.bidWall.price) < 1e-9;
        ctx.fillStyle = wall ? "rgba(49,214,109,0.42)" : "rgba(49,214,109,0.2)";
        ctx.fillRect(midX - 4 - bw, y, bw, rowH - 3);
        ctx.fillStyle = "#31d66d";
        ctx.fillRect(midX - (wall ? 8 : 6), y, wall ? 4 : 2, rowH - 3);
      });

      ctx.fillStyle = "#8a948c";
      ctx.font = "9px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText("BID", 10, h - 6);
      ctx.textAlign = "right";
      ctx.fillText("ASK", w - 10, h - 6);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [book, symbol]);

  return (
    <div className="xray">
      <div className="xrayHead">
        <span>PUBLIC BOOK X-RAY</span>
        <b>{symbol || "—"}</b>
      </div>
      <canvas ref={ref} className="xrayPlot" />
      <div className="xrayFoot">
        <span>Bid {money(book?.bidUsd)}{book?.bidWall ? ` · WALL ${money(book.bidWall.usd)}` : ""}</span>
        <span>Ask {money(book?.askUsd)}{book?.askWall ? ` · WALL ${money(book.askWall.usd)}` : ""}</span>
      </div>
    </div>
  );
}
