// The composer's unsent wish, kept in localStorage so it survives a reload,
// the daily limit, or being started on the landing page.
const DRAFT_KEY = "wishcode:draft";

export function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(value: string) {
  try {
    if (value) localStorage.setItem(DRAFT_KEY, value);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private mode or storage disabled: drafts just don't persist.
  }
}
