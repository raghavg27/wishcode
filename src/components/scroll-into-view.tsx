"use client";

import { useEffect } from "react";

/** Scrolls the element with this id into view once, after the page renders. */
export function ScrollIntoView({ id }: { id: string }) {
  useEffect(() => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  }, [id]);
  return null;
}
