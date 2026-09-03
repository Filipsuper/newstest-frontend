const cleanPoints = (points) => (points ?? [])
    .map((point) => Array.isArray(point)
        ? [Number(point[0]), Number(point[1])]
        : [Number(point?.time), Number(point?.close)])
    .filter(([time, value]) => Number.isFinite(time) && Number.isFinite(value))
    .sort((left, right) => left[0] - right[0]);

const samplePoints = (points, maximum = 96) => {
    if (points.length <= maximum) return points;
    const lastIndex = points.length - 1;
    return Array.from({ length: maximum }, (_, index) =>
        points[Math.round((index / (maximum - 1)) * lastIndex)]);
};

export default function MiniPriceChart({
    points,
    change = null,
    markerTime = null,
    label,
    className = "",
}) {
    const rows = samplePoints(cleanPoints(points));
    if (rows.length < 2) return null;

    const width = 180;
    const height = 44;
    const padX = 2;
    const padY = 4;
    const values = rows.map(([, value]) => value);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = maximum - minimum || 1;
    const step = (width - padX * 2) / (rows.length - 1);
    const coordinate = (index) => ({
        x: padX + index * step,
        y: padY + (height - padY * 2) * (1 - (values[index] - minimum) / span),
    });
    const path = rows.map((_, index) => {
        const { x, y } = coordinate(index);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const measuredChange = change !== null && change !== undefined && Number.isFinite(Number(change))
        ? Number(change)
        : values.at(-1) - values[0];
    const tone = measuredChange > 0 ? "is-positive" : measuredChange < 0 ? "is-negative" : "is-neutral";

    const numericMarker = Number(markerTime);
    let marker = null;
    if (Number.isFinite(numericMarker)
        && numericMarker >= rows[0][0]
        && numericMarker <= rows.at(-1)[0]) {
        let nearest = 0;
        for (let index = 1; index < rows.length; index += 1) {
            if (Math.abs(rows[index][0] - numericMarker) < Math.abs(rows[nearest][0] - numericMarker)) {
                nearest = index;
            }
        }
        marker = coordinate(nearest);
    }

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={`market-mini-chart ${tone} ${className}`.trim()}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : "true"}
        >
            <path
                d={`${path} L${width - padX},${height} L${padX},${height} Z`}
                fill="currentColor"
                opacity="0.075"
            />
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
            {marker && (
                <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="2.5"
                    fill="var(--color-secondary)"
                    stroke="var(--market-workbench-panel)"
                    strokeWidth="1.25"
                    vectorEffect="non-scaling-stroke"
                />
            )}
        </svg>
    );
}
