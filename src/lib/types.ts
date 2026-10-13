// Shapes returned by the database read functions (see the migration).

export type WishStatus = "open" | "being_built" | "fulfilled";

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
  metoo_count: number;
  claim_count: number;
  link_count: number;
  created_at: string;
  fulfilled_at: string | null;
  removed: boolean;
  first_link: { id: number; url: string; created_at: string; developer: DeveloperRef } | null;
  builders: DeveloperRef[];
};

export type SimilarWish = WishCard & { similarity: number };

export type WishLink = {
  id: number;
  url: string;
  description: string;
  repo_url: string | null;
  created_at: string;
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
  links: (Omit<WishLink, "developer"> & { first_to_ship: boolean; wish: WishCard })[];
  claims: { created_at: string; wish: WishCard }[];
};

export type DirectoryEntry = DeveloperRef & { links: number; building: number };

export type Viewer = {
  developer: (DeveloperRef & { is_admin: boolean }) | null;
};

export type FeedPage = {
  items: WishCard[];
  nextCursor: string | null;
};
