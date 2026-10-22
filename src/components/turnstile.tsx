"use client";

import { useCallback, useEffect, useRef } from "react";

// Cloudflare Turnstile, the bot check on posting a wish. Only renders when
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and stays invisible unless
// Cloudflare wants the visitor to tick a box.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** How long a submit waits for a token before letting the server say no. */
const TOKEN_WAIT_MS = 10_000;

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  script ??= new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    el.onerror = () => {
      script = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(el);
  });
  return script;
}

/**
 * Renders the widget into `ref` and hands out its token. Tokens are
 * single-use: call reset() once the server has checked one.
 */
export function useTurnstile(action: string) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef(new Set<(token: string) => void>());

  useEffect(() => {
    const container = ref.current;
    if (!SITE_KEY || !container) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId.current = api.render(container, {
          sitekey: SITE_KEY,
          action,
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (value: string) => {
            token.current = value;
            waiting.current.forEach((resolve) => resolve(value));
            waiting.current.clear();
          },
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            token.current = null;
          },
        });
      })
      .catch((err) => console.error("[turnstile]", err instanceof Error ? err.message : err));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      token.current = null;
    };
  }, [action]);

  /** The current token, waiting briefly for the check to finish. Null when it's off or didn't finish. */
  const getToken = useCallback((): Promise<string | null> => {
    if (!SITE_KEY) return Promise.resolve(null);
    if (token.current) return Promise.resolve(token.current);
    return new Promise((resolve) => {
      const done = (value: string | null) => {
        clearTimeout(timer);
        waiting.current.delete(done);
        resolve(value);
      };
      const timer = setTimeout(() => done(null), TOKEN_WAIT_MS);
      waiting.current.add(done);
    });
  }, []);

  const reset = useCallback(() => {
    token.current = null;
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return { ref, getToken, reset };
}
