import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, LegalSection } from "@/components/legal";
import { MIN_AGE, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Wishcode collects, why, who it's shared with, and how to get it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro={
        <p>
          Wishcode is run by me, {OPERATOR}, an individual in India. I collect as little as I can: wishing needs no
          account and no email. This page explains what I do collect, why, and how to have it deleted.
        </p>
      }
    >
      <LegalSection title="What's public">
        <p>Anything you post on Wishcode is public and can be indexed by search engines:</p>
        <ul>
          <li>Wishes (shown as “anonymous wisher”), their me-too counts, and the share images made from them.</li>
          <li>
            For developers: your GitHub handle and avatar, the wishes you claim, and the links, descriptions and source
            links you post.
          </li>
        </ul>
        <p>Who posted a wish, who me-too&apos;d it and how anyone voted are never shown.</p>
      </LegalSection>

      <LegalSection title="What I collect">
        <ul>
          <li>
            <strong>A device cookie.</strong> The first time you post, me-too, vote or report, your browser gets a random
            code in a cookie (<code>wc_device</code>, kept for 2 years). I store only a one-way hash of it. It links
            your wishes, me-toos, votes, reports and email sign-ups to your browser, so you can take a me-too back and
            so the daily limits work. It isn&apos;t tied to your name.
          </li>
          <li>
            <strong>Your IP address, hashed.</strong> To stop abuse from one network, I count actions per network using
            a salted hash of your IP address. These counters expire within a day. I don&apos;t store raw IP addresses,
            though my hosting providers keep their own short-lived logs.
          </li>
          <li>
            <strong>Your email address, if you give it.</strong> If you ask to hear when someone builds a wish, I store
            your address with that wish and use it only for those emails. Every email has an unsubscribe link. If you
            choose “stop all emails”, I keep your address on a do-not-email list so I never email it again.
          </li>
          <li>
            <strong>Reports.</strong> When you report a wish or link, I store the reason with your device hash.
          </li>
          <li>
            <strong>For developers who connect GitHub:</strong> your GitHub user ID, handle, avatar and the email address
            on your GitHub account. I use the email only to tell you when someone confirms your link works, and you can
            turn that off from the email. I don&apos;t request access to your repositories. A session cookie (named{" "}
            <code>sb-…</code>) keeps you signed in.
          </li>
          <li>
            <strong>Your unsent draft.</strong> The wish you&apos;re typing is saved in your browser&apos;s local
            storage so it survives a reload. It never leaves your device until you post it.
          </li>
          <li>
            <strong>Usage analytics.</strong> PostHog records page views and actions such as posting a wish or tapping
            share, along with standard request details (browser, device type, approximate location from your IP). It
            sets no cookies and records no sessions.
          </li>
          <li>
            <strong>Error reports.</strong> When something breaks, Sentry receives the error, the page it happened on and
            your browser and device type. It sets no cookies and records no sessions.
          </li>
        </ul>
        <p>I don&apos;t use advertising cookies, sell your data, or share it with advertisers.</p>
      </LegalSection>

      <LegalSection title="Why I use it">
        <ul>
          <li>To run the service: show wishes and links, count me-toos and votes, and send the emails you asked for.</li>
          <li>To keep it safe: rate limits, bot checks, reports and removing content that breaks the rules.</li>
          <li>To improve it, using aggregate analytics.</li>
        </ul>
        <p>
          If you&apos;re in the EU or UK, my legal bases are your consent (emails, which you can withdraw at any time),
          performance of our agreement (developer accounts), and my legitimate interest in running a safe, working
          service (everything else).
        </p>
      </LegalSection>

      <LegalSection title="Who I share it with">
        <p>Only the services that run Wishcode, each for its own part:</p>
        <ul>
          <li>Vercel hosts the website.</li>
          <li>Supabase stores the database and handles GitHub sign-in.</li>
          <li>GitHub, when you choose to sign in with it.</li>
          <li>Cloudflare Turnstile checks that whoever posts a wish isn&apos;t a bot, using signals from your browser.</li>
          <li>Google (Gmail) delivers the emails.</li>
          <li>PostHog provides the analytics.</li>
          <li>Sentry receives error reports.</li>
        </ul>
        <p>
          These providers may process data in the United States and other countries. I&apos;ll also disclose data if
          the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="How long I keep it">
        <ul>
          <li>Wishes, links and claims stay until they&apos;re removed. Removed wishes stop showing their text.</li>
          <li>Email sign-ups last until you unsubscribe; the do-not-email list is kept so the request sticks.</li>
          <li>Rate-limit counters expire within a day.</li>
          <li>Developer profiles last until you ask me to delete them.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You can ask me to access, correct or delete your data, or to stop using it. Email <ContactLink /> and
          I&apos;ll reply within 30 days. Wishes aren&apos;t tied to an account, so send me the wish&apos;s link if
          you want one removed. You can unsubscribe from any email with one click. If you&apos;re
          in the EU or UK you can also object to or restrict processing, ask for a portable copy, and complain to your
          data protection authority.
        </p>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, {OPERATOR} handles grievances at <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>Wishcode is for people aged {MIN_AGE} or over. If you think a child has given me their data, email me and I&apos;ll delete it.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If I change this policy, I&apos;ll update the date at the top, and for significant changes I&apos;ll put a
          notice on the site. See also the <Link href="/terms" className="font-medium text-primary underline underline-offset-2">terms of use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
