import type { Metadata } from "next";
import { WishPage, wishMetadata } from "@/components/wish-page";

// The wisher's share URL: the wish page, with "My wish came true" as the
// link preview.

export function generateMetadata({ params }: PageProps<"/w/[id]/came-true">): Promise<Metadata> {
  return wishMetadata(params, true);
}

export default function Page({ params, searchParams }: PageProps<"/w/[id]/came-true">) {
  return <WishPage params={params} searchParams={searchParams} cameTrue />;
}
