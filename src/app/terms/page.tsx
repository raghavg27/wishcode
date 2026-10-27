import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, LegalSection } from "@/components/legal";
import { GOVERNING_LAW, MIN_AGE, OPERATOR } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description: "The rules for posting wishes and links on Wishcode.",
  path: "/terms",
});

const link = "font-medium text-primary underline underline-offset-2";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          Wishcode is run by me, {OPERATOR}. By using it you agree to these terms. They&apos;re short, but they matter:
          please read them.
        </p>
      }
    >
      <LegalSection title="Who can use Wishcode">
        <p>
          You must be {MIN_AGE} or over. Developers need a GitHub account and must follow GitHub&apos;s terms too.
        </p>
      </LegalSection>

      <LegalSection title="Wishes are public ideas">
        <p>
          A wish is an open invitation for anyone to build it. By posting one, you agree that anyone may build, sell or
          give away an app based on it, and that you have no claim to that app, its revenue or credit for it beyond what
          the site shows. Don&apos;t post an idea you want to keep to yourself or that belongs to someone else, such as
          your employer&apos;s confidential plans.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep the rights to what you post. You give me a worldwide, free, non-exclusive licence to host, show,
          copy and share it as part of running and promoting Wishcode, including in share images. The licence ends
          when the content is removed, except for copies others have already shared.
        </p>
        <p>You&apos;re responsible for what you post. Don&apos;t post anything that:</p>
        <ul>
          <li>is spam, advertising, or posted by bots or scripts;</li>
          <li>is hateful, harassing, threatening or abusive;</li>
          <li>shares someone else&apos;s private information;</li>
          <li>is sexually explicit, illegal, or encourages anything illegal;</li>
          <li>infringes someone&apos;s copyright, trademark or other rights;</li>
          <li>impersonates someone or misleads people about who you are.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Links and apps from developers">
        <p>
          Developers are solely responsible for the links they post and the apps behind them. A link must not lead to
          malware, phishing, scams or anything on the list above, and you must have the right to share what it links
          to.
        </p>
        <p>
          I don&apos;t check links before they go up, and I don&apos;t make, endorse or vouch for any app linked
          here. “Fulfilled ✓” means people who wanted the wish said it works, not that it&apos;s safe. Open links with
          care; using an app is between you and its developer.
        </p>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>
          Don&apos;t try to get around the daily limits, inflate me-toos or votes, scrape the site in a way that
          strains it, or interfere with how it works. The <Link href="/principles" className={link}>principles page</Link>{" "}
          lists the limits.
        </p>
      </LegalSection>

      <LegalSection title="Removal and reports">
        <p>
          I can remove any wish, link or claim, and block anyone from using Wishcode, if I believe they break these
          terms or the law or put others at risk. Use Report on any wish or link, or email <ContactLink />, including
          for copyright complaints.
        </p>
        <p>
          Grievance officer (under India&apos;s Information Technology Rules, 2021): {OPERATOR}, <ContactLink />. I
          acknowledge complaints within 24 hours and aim to resolve them within 15 days.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          Wishcode is free and provided “as is”, without warranties of any kind. It may change, break or shut down, and
          content may be lost. To the extent the law allows, I&apos;m not liable for any indirect or consequential loss,
          or for anything caused by content or apps posted by others, and my total liability to you is limited to
          ₹1,000.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          The <Link href="/privacy" className={link}>privacy policy</Link> explains what I collect and how to get it
          deleted.
        </p>
      </LegalSection>

      <LegalSection title="Changes and law">
        <p>
          If I change these terms, I&apos;ll update the date at the top; using Wishcode after that means you accept
          the new terms. These terms are governed by the laws of {GOVERNING_LAW}, and its courts handle any dispute.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
