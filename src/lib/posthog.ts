// Analytics go to the site itself under this path, so ad blockers don't drop
// them, and proxy.ts forwards them to PostHog.
export const POSTHOG_RELAY = "/relay";

export const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");

const CLOUD_HOST = /^https:\/\/(us|eu)\.i\.posthog\.com$/;

/**
 * The PostHog URL for a relayed path. PostHog Cloud serves the SDK's files
 * (/static, /array) from a separate assets host; a self-hosted PostHog serves
 * everything from one.
 */
export function posthogUpstream(relayedPath: string, host = POSTHOG_HOST): URL {
  const path = relayedPath.slice(POSTHOG_RELAY.length) || "/";
  const cloud = host.match(CLOUD_HOST);
  const assets = cloud && /^\/(static|array)\//.test(path) ? `https://${cloud[1]}-assets.i.posthog.com` : host;
  return new URL(path, assets);
}

/** The PostHog app, for links the SDK shows (such as the toolbar). */
export function posthogUiHost(host = POSTHOG_HOST): string {
  const cloud = host.match(CLOUD_HOST);
  return cloud ? `https://${cloud[1]}.posthog.com` : host;
}
