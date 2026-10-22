"use client";

import { useEffect, useRef } from "react";

/**
 * The sticky header. While it sits over a night section (anything marked
 * data-night) it swaps paper for a see-through night blue and turns its text light; see
 * header[data-over-night] in globals.css.
 */
export function HeaderShell({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current!;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = header.offsetHeight / 2;
      const over = Array.from(document.querySelectorAll("[data-night]")).some((el) => {
        const { top, bottom } = el.getBoundingClientRect();
        return top <= line && bottom >= line;
      });
      header.toggleAttribute("data-over-night", over);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Client navigations swap the page under the header without scrolling.
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <header ref={ref} className={className}>
      {children}
    </header>
  );
}
