export function CodehypeBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://www.codehype.ai/product/wishcode?utm_source=codehype_badge"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block opacity-70 transition-opacity hover:opacity-100 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote SVG badge, served as-is by CodeHype */}
      <img
        src="https://www.codehype.ai/badges/wishcode.svg?variant=find-us&v=20"
        alt="Featured on CodeHype"
        width={180}
        height={65}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </a>
  );
}
