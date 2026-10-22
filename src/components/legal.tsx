import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

// Layout shared by /privacy and /terms.

export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">{title}</h1>
      <p className="mt-2 text-label text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 font-serif text-[20px] leading-8 text-ink-muted italic">{intro}</div>
      <div className="mt-10 space-y-10">{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-headline font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  );
}
