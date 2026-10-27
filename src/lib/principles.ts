import { DISCLAIMER, LIMITS, WISH_MAX, WISH_MIN } from "@/lib/config";

// How Wishcode is run. Shown on /principles and in /llms-full.txt.
export const PRINCIPLES = [
  {
    title: "Anyone can wish.",
    body: `Post one sentence (${WISH_MIN} to ${WISH_MAX} characters). No account. Leave an email if you want, and I will tell you when someone builds it. I only use it for that, and every email has an unsubscribe link. Wishes stay up unless they are spam, abusive or share someone's private information.`,
  },
  {
    title: "Everyone can see the demand.",
    body: "Every wish shows how many people want it, who is building it and what they have built. One me-too per device per wish, and you can take it back.",
  },
  {
    title: "Claiming a wish does not lock it.",
    body: "Developers who connect GitHub can say “I am building this.” Claims never run out, many people can claim the same wish, and nobody has to claim before they ship.",
  },
  {
    title: "The people who wanted it decide if it works.",
    body: "When a developer posts a link, the wish shows Fulfilled · unverified. If the wisher says it works, or 3 people who gave it a me-too say so, it becomes Fulfilled ✓. If enough of them say it does not work, the link is hidden behind a warning.",
  },
  {
    title: "Open links with care.",
    body: `${DISCLAIMER} They open in a new tab, show who posted them, and the developer or I can take them down. If a wish or link is spam, abusive, shares someone's private information or looks like a scam, tap Report and I will look at it.`,
  },
  {
    title: "Fair use.",
    body: `To keep things fair: ${LIMITS.wishesPerDevicePerDay} wishes and ${LIMITS.metoosPerDevicePerDay} me-toos per device per day (${LIMITS.wishesPerNetworkPerDay} wishes and ${LIMITS.metoosPerNetworkPerDay} me-toos per shared network), ${LIMITS.claimsPerDeveloperPerDay} claims and ${LIMITS.linksPerDeveloperPerDay} links per developer per day, and ${LIMITS.subscriptionsPerDevicePerDay} email sign-ups per device per day (${LIMITS.subscriptionsPerNetworkPerDay} per shared network). Limits reset at midnight UTC.`,
  },
];
