// Shapes returned by the database read functions (see the migration).

export type WishStatus = "open" | "being_built" | "fulfilled";

/** Set by votes: the wisher's verdict overrides, otherwise 3 votes decide. */
export type LinkVerdict = "unverified" | "verified" | "flagged";

export type DeveloperRef = {
  id: string;
  handle: string;
  avatar_url: string | null;
};

export type WishCard = {
  id: number;
  /** Null when the wish was removed by an admin. */
  text: string | null;
  status: WishStatus;
  /** True while at least one link is verified. */
  verified: boolean;
  metoo_count: number;
  claim_count: number;
  /** All links, including flagged ones. */
  link_count: number;
  /** Links that aren't flagged. These drive the status. */
  live_link_count: number;
  created_at: string;
  fulfilled_at: string | null;
  removed: boolean;
  /** First link that isn't flagged. */
  first_link: { id: number; url: string; created_at: string; verdict: LinkVerdict; developer: DeveloperRef } | null;
  builders: DeveloperRef[];
};

export type SimilarWish = WishCard & { similarity: number };

export type WishLink = {
  id: number;
  url: string;
  description: string;
  repo_url: string | null;
  created_at: string;
  verdict: LinkVerdict;
  /** Me-too-ers' votes; the wisher's vote is wisher_verdict. */
  works_count: number;
  broken_count: number;
  wisher_verdict: boolean | null;
  developer: DeveloperRef;
};

export type WishClaim = {
  created_at: string;
  developer: DeveloperRef;
};

export type WishDetail = WishCard & {
  links: WishLink[];
  claims: WishClaim[];
};

export type LedgerStats = {
  counts: { all: number; open: number; being_built: number; fulfilled: number };
  week: { wishes: number; wishes_prev: number; metoos: number; fulfilled: number };
  most_wanted: { id: number; text: string; metoo_count: number }[];
};

export type DeveloperProfile = DeveloperRef & {
  joined_at: string;
  stats: { links: number; first_to_ship: number; building: number };
  links: (Pick<WishLink, "id" | "url" | "description" | "repo_url" | "created_at" | "verdict"> & {
    first_to_ship: boolean;
    wish: WishCard;
  })[];
  claims: { created_at: string; wish: WishCard }[];
};

export type DirectoryEntry = DeveloperRef & { links: number; building: number };

/** What this browser has done on a wish page. Never includes the email. */
export type ViewerWishState = {
  is_wisher: boolean;
  has_metoo: boolean;
  subscribed: boolean;
  /** link id -> works */
  verdicts: Record<string, boolean>;
};

export type Viewer = {
  developer: (DeveloperRef & { is_admin: boolean }) | null;
};

export type FeedPage = {
  items: WishCard[];
  nextCursor: string | null;
};
