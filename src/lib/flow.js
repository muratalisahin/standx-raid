export function seedFlow(nodes, now = 0) {
  const particles = [];
  for (const node of nodes) {
    const count = 3 + Math.round((node.pipe.width - 1.4) * 1.6);
    for (let k = 0; k < count; k++) {
      particles.push({
        id: `${node.symbol}-${k}`,
        symbol: node.symbol,
        t: (k / count + now * 0.00004) % 1,
        speed: 0.00008 + node.pipe.width * 0.000018,
        size: 1.4 + node.pipe.width * 0.18,
      });
    }
  }
  return particles;
}

export function stepFlow(particles, dt) {
  for (const p of particles) {
    p.t += p.speed * dt;
    if (p.t >= 1) p.t -= 1;
  }
  return particles;
}

export function drawFlow(ctx, layout, particles, selected) {
  const { width, height, nodes } = layout;
  ctx.clearRect(0, 0, width, height);
  const bySym = new Map(nodes.map((n) => [n.symbol, n]));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    const node = bySym.get(p.symbol);
    if (!node) continue;
    const pt = node.pipe.point(p.t);
    const hot = selected === p.symbol;
    ctx.beginPath();
    ctx.fillStyle = hot ? "rgba(49,214,109,0.95)" : "rgba(49,214,109,0.55)";
    ctx.arc(pt.x, pt.y, hot ? p.size + 0.6 : p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
