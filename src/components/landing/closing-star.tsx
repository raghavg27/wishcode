"use client";

import { useRef } from "react";
import { gsap, REDUCED_MOTION, useGSAP } from "@/components/landing/gsap";
import { StarMark } from "@/components/landing/star-mark";

/** The star again at the bottom of the page: its trail draws in, tail last. */
export function ClosingStar({ className }: { className?: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia(REDUCED_MOTION).matches) return;
      const q = gsap.utils.selector(scope);
      gsap
        .timeline({ scrollTrigger: { trigger: scope.current, start: "top 85%", once: true } })
        .from(q("[data-core]"), { scale: 0, rotation: -120, svgOrigin: "40 24", duration: 1, ease: "back.out(2.5)" })
        .from(q("[data-dash]"), { scale: 0, svgOrigin: "40 24", duration: 0.5, stagger: 0.12, ease: "power2.out" }, 0.25);
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      <StarMark className="w-full drop-shadow-[0_0_24px_rgba(244,183,64,0.45)]" />
    </div>
  );
}
