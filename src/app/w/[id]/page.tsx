import type { Metadata } from "next";
import { WishPage, wishMetadata } from "@/components/wish-page";

export function generateMetadata({ params }: PageProps<"/w/[id]">): Promise<Metadata> {
  return wishMetadata(params);
}

export default function Page({ params, searchParams }: PageProps<"/w/[id]">) {
  return <WishPage params={params} searchParams={searchParams} />;
}
