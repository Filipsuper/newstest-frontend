"use client";

export const COMPANY_PROFILE_AXES = [
    { key: "value", label: "Värdering" },
    { key: "growth", label: "Tillväxt" },
    { key: "past", label: "Historik" },
    { key: "health", label: "Hälsa" },
    { key: "insiders", label: "Insyn" },
    { key: "dividend", label: "Utdelning" },
];

const finite = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const polarPoint = (index, radius, center = 95) => {
    const angle = ((index * 60) - 90) * (Math.PI / 180);
    return {
        x: center + (Math.cos(angle) * radius),
        y: center + (Math.sin(angle) * radius),
    };
};

const smoothClosedPath = (points, tension = 0.72) => {
    if (points.length < 3) return "";
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

export default function CompanyProfileRadar({ companyName, loading = false, profile, compact = false }) {
    const radius = 53;
    const profileByKey = new Map(
        (Array.isArray(profile?.axes) ? profile.axes : []).map((axis) => [axis.key, axis]),
    );
    const axes = COMPANY_PROFILE_AXES.map((axis) => {
        const score = finite(profileByKey.get(axis.key)?.score);
        return { ...axis, score: score === null ? null : Math.max(0, Math.min(5, score)) };
    });
    const knownScores = axes.map((axis) => axis.score).filter((score) => score !== null);
    const averageScore = knownScores.length
        ? knownScores.reduce((sum, score) => sum + score, 0) / knownScores.length
        : null;
    // Missing axes borrow the profile average only to close the visual area.
    // Their label stays “–” and their point is hollow, so no score is invented.
    const points = axes.map((axis, index) => ({
        ...polarPoint(index, radius * (0.14 + (((axis.score ?? averageScore ?? 0) / 5) * 0.86))),
        missing: axis.score === null,
    }));
    const labelRadius = compact ? 68 : 76;
    const labels = COMPANY_PROFILE_AXES.map((axis, index) => {
        const position = polarPoint(index, labelRadius);
        const direction = position.x - 95;
        return {
            ...axis,
            ...position,
            anchor: direction > 12 ? "start" : direction < -12 ? "end" : "middle",
        };
    });
    const availableScores = knownScores.length;
    const hasProfile = Boolean(profile) && availableScores > 0;
    const tone = !hasProfile
        ? "neutral"
        : averageScore >= 3.25
            ? "high"
            : averageScore < 1.75
                ? "low"
                : "mixed";
    const toneLabel = tone === "high" ? "stark" : tone === "low" ? "svag" : "blandad";
    const stateClass = loading ? " is-loading" : hasProfile ? ` stock-profile--${tone}` : " is-empty";
    const description = loading
        ? `Bolagsprofil för ${companyName} laddas`
        : hasProfile
            ? `${companyName}: ${toneLabel} profil. ${axes.map((axis) => `${axis.label} ${axis.score ?? "saknas"} av 5`).join(", ")}`
            : `Bolagsprofil saknas för ${companyName}`;

    return (
        <svg className={`stock-profile${compact ? " stock-profile--compact" : ""}${stateClass}`} viewBox={compact ? "32 32 126 126" : "0 0 190 190"} role="img" aria-label={description}>
            <title>{description}</title>
            {[1, 2, 3].map((ring) => (
                <circle key={ring} className="stock-profile__ring" cx="95" cy="95" r={(radius * ring) / 3} />
            ))}
            {COMPANY_PROFILE_AXES.map((axis, index) => {
                const endpoint = polarPoint(index, radius);
                return <line key={axis.key} className="stock-profile__spoke" x1="95" y1="95" x2={endpoint.x} y2={endpoint.y} />;
            })}
            {loading && <circle className="stock-profile__placeholder" cx="95" cy="95" r="28" />}
            {hasProfile && <path className="stock-profile__shape" d={smoothClosedPath(points)} />}
            {hasProfile && points.map((point, index) => (
                <circle
                    key={COMPANY_PROFILE_AXES[index].key}
                    className={point.missing ? "stock-profile__missing-point" : "stock-profile__point"}
                    cx={point.x}
                    cy={point.y}
                    r={point.missing ? "2.8" : "2.1"}
                />
            ))}
            {!compact && labels.map((label, index) => (
                <text key={label.key} className="stock-profile__label" x={label.x} y={label.y - 3} textAnchor={label.anchor}>
                    <tspan x={label.x}>{label.label}</tspan>
                    <tspan className="stock-profile__score" x={label.x} dy="10">{loading ? "·" : axes[index].score ?? "–"}</tspan>
                </text>
            ))}
        </svg>
    );
}
