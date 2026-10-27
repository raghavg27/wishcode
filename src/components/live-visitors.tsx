"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { badgeCount, HIDDEN_GRACE_MS, PRESENCE_CHANNEL, visitorId } from "@/lib/presence";

// One client per page load: Realtime only, no auth session of its own.
let client: SupabaseClient | null = null;
function realtimeClient(url: string, publishableKey: string) {
  return (client ??= createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}

/**
 * "👁 3" in the header: how many people are on Wishcode right now, live.
 * Hidden until at least two are here, and silently absent if Realtime is
 * unreachable.
 */
export function LiveVisitors({ url, publishableKey }: { url: string; publishableKey: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = realtimeClient(url, publishableKey);
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: visitorId() } } });
    let subscribed = false;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

    channel
      .on("presence", { event: "sync" }, () => setCount(badgeCount(channel.presenceState())))
      .subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        if (subscribed && !document.hidden) void channel.track({});
      });

    // A tab left in the background stops counting after a minute.
    const onVisibility = () => {
      clearTimeout(hiddenTimer);
      if (document.hidden) {
        hiddenTimer = setTimeout(() => void channel.untrack(), HIDDEN_GRACE_MS);
      } else if (subscribed) {
        void channel.track({});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(hiddenTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [url, publishableKey]);

  if (count === null) return null;
  const label = `${count} people on Wishcode right now`;
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="flex animate-roll-in-down items-center gap-1 overflow-hidden text-label-sm font-medium text-ink-muted"
    >
      <Eye className="size-[18px]" aria-hidden />
      <span key={count} className="animate-roll-in-up tabular-nums">
        {count}
      </span>
    </span>
  );
}
