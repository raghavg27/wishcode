import { Frame, GOLD, INK, MUTED, Mark, SUBTLE, Wordmark, cardResponse } from "@/lib/og-card";
import { siteUrl } from "@/lib/site";

// GET /api/og/site — the share card for pages without one of their own
// (home, the feed, profiles, about…).

export async function GET() {
  const host = new URL(siteUrl()).host;
  return cardResponse(
    <Frame>
      <Wordmark />

      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 84, lineHeight: 1.08, letterSpacing: -2.5, color: INK }}>
          I wish there was an app that…
        </div>
        <div style={{ display: "flex", fontSize: 34, lineHeight: 1.35, color: MUTED }}>
          Post an app idea. See who else wants it. Developers build it.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #3a3870", paddingTop: 28, fontSize: 26, color: SUBTLE }}>
        <div style={{ display: "flex", color: GOLD, fontWeight: 700 }}>No signup to wish</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mark size={30} />
          {host}
        </div>
      </div>
    </Frame>,
  );
}
