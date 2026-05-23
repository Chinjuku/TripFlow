export function TopoPattern() {
  const rings = Array.from({ length: 14 }, (_, i) => 60 + i * 38);
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 800"
      preserveAspectRatio="xMinYMin slice"
      className="text-foreground/[0.06] absolute inset-0 h-full w-full"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        transform="translate(180 420)"
      >
        {rings.map((r) => (
          <circle key={r} cx={0} cy={0} r={r} />
        ))}
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        transform="translate(680 720)"
      >
        {[40, 80, 120, 160, 200, 240, 280].map((r) => (
          <circle key={r} cx={0} cy={0} r={r} />
        ))}
      </g>
    </svg>
  );
}
