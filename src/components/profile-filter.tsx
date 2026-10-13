import clsx from "clsx";
import Link from "next/link";
import { developerPath } from "@/lib/site";

export function ProfileLinkFilter({
  handle,
  filter,
  total,
  first,
}: {
  handle: string;
  filter: "all" | "first" | "top";
  total: number;
  first: number;
}) {
  const options = [
    { value: "all", label: `All (${total})` },
    { value: "first", label: `First to ship (${first})` },
    { value: "top", label: "Most me-toos" },
  ] as const;
  return (
    <nav aria-label="Filter links" className="flex items-center gap-1 rounded-full bg-surface-low p-1 text-label">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.value === "all" ? developerPath(handle) : `${developerPath(handle)}?filter=${o.value}`}
          scroll={false}
          aria-current={filter === o.value ? "page" : undefined}
          className={clsx(
            "rounded-full px-3 py-1 font-medium whitespace-nowrap",
            filter === o.value ? "bg-surface-lowest text-ink shadow-sm" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
