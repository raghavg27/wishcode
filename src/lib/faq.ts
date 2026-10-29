import { WISH_MAX, WISH_MIN } from "@/lib/config";

// Common questions, answered from the principles, terms and privacy pages.
// Shown on /principles and given to search engines as FAQPage data.
export const FAQ = [
  {
    question: "Do I need an account to post a wish?",
    answer: `No. Write one sentence (${WISH_MIN} to ${WISH_MAX} characters) and post it. Leave an email only if you want to hear when someone builds it.`,
  },
  {
    question: "Is Wishcode free?",
    answer: "Yes, for wishers and developers. I run it myself.",
  },
  {
    question: "Is my wish anonymous?",
    answer:
      "Yes. Wishes show as “anonymous wisher”, and who posted a wish or gave it a me-too is never shown. I keep a one-way hash of a device cookie so the daily limits work, and nothing that ties it to your name.",
  },
  {
    question: "Who owns an app built from my wish?",
    answer:
      "The developer who builds it. A wish is an open invitation: anyone may build, sell or give away an app based on it. Do not post an idea you want to keep to yourself.",
  },
  {
    question: "Can I build a wish someone else has claimed?",
    answer: "Yes. Claims never run out, many developers can claim the same wish, and nobody has to claim before they ship.",
  },
  {
    question: "How does a wish become Fulfilled ✓?",
    answer:
      "When a developer posts a link, the wish shows Fulfilled · unverified. It becomes Fulfilled ✓ when the wisher, or 3 people who gave it a me-too, say the app works.",
  },
];
