// Pure geometry shared by the interactive profile and static social artwork.
// Keep the soft curve and minimum radius identical across both renderers.
export const polarPoint = (index, radius, center = 95) => {
  const angle = ((index * 60) - 90) * (Math.PI / 180);
  return {
    x: center + (Math.cos(angle) * radius),
    y: center + (Math.sin(angle) * radius),
  };
};

export const smoothClosedPath = (points, tension = 0.72) => {
  if (points.length < 3) return '';
  const control = tension / 6;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  points.forEach((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const after = points[(index + 2) % points.length];
    const cp1 = {
      x: current.x + ((next.x - previous.x) * control),
      y: current.y + ((next.y - previous.y) * control),
    };
    const cp2 = {
      x: next.x - ((after.x - current.x) * control),
      y: next.y - ((after.y - current.y) * control),
    };
    path += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  });
  return `${path} Z`;
};
