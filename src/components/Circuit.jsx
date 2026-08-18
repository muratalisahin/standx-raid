import React, { useEffect, useRef } from "react";
import { drawFlow, seedFlow, stepFlow } from "../lib/flow.js";
import { pct, px } from "../lib/format.js";
import Stander from "./Stander.jsx";

export default function Circuit({ layout, selected, onSelect, ticks, sip, imbalance, raid }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const layoutRef = useRef(layout);
  const selectedRef = useRef(selected);
  const seedKeyRef = useRef("");

  useEffect(() => {
    layoutRef.current = layout;
    selectedRef.current = selected;
    const key = layout?.nodes?.map((n) => n.symbol).join("|") || "";
    if (layout?.nodes && key !== seedKeyRef.current) {
      seedKeyRef.current = key;
      particlesRef.current = seedFlow(layout.nodes, performance.now());
    }
  }, [layout, selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let last = performance.now();

    const loop = (now) => {
      const dt = Math.min(48, now - last);
      last = now;
      const L = layoutRef.current;
      if (L) {
        stepFlow(particlesRef.current, dt);
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(L.width * dpr) || canvas.height !== Math.round(L.height * dpr)) {
          canvas.width = Math.round(L.width * dpr);
          canvas.height = Math.round(L.height * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFlow(ctx, L, particlesRef.current, selectedRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layout]);

  if (!layout) return null;
  const { cx, cy, ringR, coreR, nodes, width, height, compact } = layout;
  const sipClass = sip ? `sip-${sip.replace("-", "")}` : "";
  const guide = compact ? 8 : 22;
  const glow = compact ? coreR * 1.25 : coreR + 36;

  return (
    <div className={`circuitStage ${sipClass} ${compact ? "compact" : ""} ${raid ? "raidPlay" : ""}`} style={{ width, height }}>
      <canvas ref={canvasRef} className="flowLayer" />
      <svg className="pipeLayer" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#31d66d" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#31d66d" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#31d66d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={ringR + guide} className="ringGuide" />
        <circle cx={cx} cy={cy} r={ringR} className="ringGuide dim" />
        <circle cx={cx} cy={cy} r={glow} fill="url(#coreGlow)" />

        {nodes.map((node) => (
          <path
            key={`p-${node.symbol}`}
            d={node.pipe.d}
            className={`pipe ${selected === node.symbol ? "on" : ""} vol`}
            strokeWidth={node.pipe.width}
            fill="none"
          />
        ))}

        <circle cx={cx} cy={cy} r={coreR} className="coreDisk" />
        <circle cx={cx} cy={cy} r={coreR - 7} className="coreInner" />

        {nodes.map((node) => {
          const on = selected === node.symbol;
          const up = node.change >= 0;
          const dir = ticks?.[node.symbol] || 0;
          const pulse = Math.min(3.2, 1.2 + Math.abs(node.funding) * 8000);
          const oiHot = node.oi >= Math.max(...nodes.map((n) => n.oi)) * 0.55;
          return (
            <g
              key={node.symbol}
              className={`mod ${on ? "on" : ""} ${dir > 0 ? "tickUp" : dir < 0 ? "tickDown" : ""} ${oiHot ? "oiHot" : ""}`}
              transform={`translate(${node.x} ${node.y})`}
              onClick={() => onSelect(node.symbol)}
              style={{ cursor: "pointer" }}
            >
              <circle r={node.r + (compact ? 4 : 7)} className="modHalo" style={{ animationDuration: `${pulse}s` }} />
              <circle r={node.r} className="modDisk" />
              {on && Number.isFinite(imbalance) && (
                <path
                  d={`M ${-node.r - 4} 0 A ${node.r + 4} ${node.r + 4} 0 0 ${imbalance >= 0 ? 1 : 0} ${node.r + 4} 0`}
                  className={imbalance >= 0 ? "imbBid" : "imbAsk"}
                  fill="none"
                  strokeWidth={compact ? 2 : 3}
                />
              )}
              <text y={compact ? 1 : -2} className="modBase">{node.base}</text>
              {!compact && <text y={12} className={`modChg ${up ? "up" : "down"}`}>{pct(node.change)}</text>}
              <text y={node.r + (compact ? 11 : 16)} className="modPx">{compact ? pct(node.change) : px(node.mark)}</text>
            </g>
          );
        })}
      </svg>
      <button
        type="button"
        className="coreMascot"
        style={{ left: cx, top: cy, width: coreR * 2, height: coreR * 2 }}
        onClick={() => onSelect(null)}
      >
        <Stander pose={raid ? "focus" : "front"} className="coreMascotImg" />
        <span>{raid ? "HIT CORE" : "STANDER · DUSD"}</span>
      </button>
    </div>
  );
}
