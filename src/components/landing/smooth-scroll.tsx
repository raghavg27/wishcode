"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { gsap, REDUCED_MOTION, ScrollTrigger } from "@/components/landing/gsap";

/**
 * Lenis smooth scrolling for the landing page only, driven by gsap's ticker so
 * ScrollTrigger and Lenis agree on every frame. Off when motion is reduced.
 */
export function SmoothScroll() {
  const router = useRouter();

  // "Post a wish" links used to point at /#compose, when the feed lived here.
  useEffect(() => {
    if (window.location.hash === "#compose") router.replace("/wishes#compose");
  }, [router]);

  // Sections that stream in move everything below them; re-measure triggers.
  useEffect(() => {
    let timer = 0;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observer.observe(document.body);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}
