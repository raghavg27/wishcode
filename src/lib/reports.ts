// Why someone reports a wish or link. Matches public.report_reason; shared by
// the report form and the admin queue.

export const REPORT_REASONS = {
  malicious_link: "Malware, phishing or a scam",
  spam: "Spam or advertising",
  abuse: "Hateful, harassing or abusive",
  personal_info: "Shares someone's private information",
  illegal: "Illegal or sexually explicit",
  mistake: "I added this wish by mistake",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

/**
 * Reasons offered for a wish or a link. Only links get malicious_link, listed
 * first; only wishes get mistake, listed last.
 */
export function reportReasonsFor(target: "wish" | "link"): ReportReason[] {
  const all = Object.keys(REPORT_REASONS) as ReportReason[];
  return all.filter((r) => r !== (target === "link" ? "mistake" : "malicious_link"));
}

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && Object.hasOwn(REPORT_REASONS, value);
}
