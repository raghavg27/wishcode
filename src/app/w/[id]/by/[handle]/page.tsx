import type { Metadata } from "next";
import { WishPage, wishMetadata } from "@/components/wish-page";

// A developer's share URL: the wish page with their link highlighted, and
// their "I built it" card as the link preview.

export function generateMetadata({ params }: PageProps<"/w/[id]/by/[handle]">): Promise<Metadata> {
  return wishMetadata(params);
}

export default function Page({ params, searchParams }: PageProps<"/w/[id]/by/[handle]">) {
  return <WishPage params={params} searchParams={searchParams} />;
}
