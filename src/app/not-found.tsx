import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { NotFoundView, type NotFoundKind } from "@/components/not-found-view";
import { MISSING_HEADER } from "@/lib/page-exists";

export const metadata: Metadata = { title: "Not found" };

// Also serves unknown /w/:id and /d/:handle page loads, which src/proxy.ts
// rewrites here (with a header naming what was missing) to get a 404 status.
export default function NotFound() {
  return (
    <Suspense fallback={<NotFoundView kind="page" />}>
      <ContextualNotFound />
    </Suspense>
  );
}

async function ContextualNotFound() {
  const missing = (await headers()).get(MISSING_HEADER);
  const kind: NotFoundKind = missing === "wish" || missing === "developer" ? missing : "page";
  return <NotFoundView kind={kind} />;
}
