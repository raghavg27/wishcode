import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Features",
  description: "Everything Wishcode does, and the reason behind each part, for wishers, developers and everyone else.",
  path: "/features",
});

const SECTIONS: { title: string; features: { title: string; body: string }[] }[] = [
  {
    title: "For people with a wish",
    features: [
      {
        title: "No account needed.",
        body: "A sign-up form is where most ideas give up. Just finish the sentence “I wish there was an app that…”, post it and it goes live.",
      },
      {
        title: "Same idea? You will see it first.",
        body: "If ten people post the same wish, the votes get split ten ways. So before you post, I show you wishes that mean the same thing, even if the words are different. You can add your me-too there instead.",
      },
      {
        title: "Your words are saved.",
        body: "Ideas are easy to lose. If you leave in the middle, your words are still there when you come back.",
      },
      {
        title: "A little party when you post.",
        body: "You get confetti, and an easy way to share your wish while it is new. More me-toos bring more developers.",
      },
      {
        title: "An email when someone builds it.",
        body: "You should not have to keep checking. Leave your email only if you want to hear back. You can stop the emails with one click.",
      },
      {
        title: "You decide if it works.",
        body: "A link does not prove the app does what you asked. When a developer posts one, you say Yes or No.",
      },
      {
        title: "A card to share when your wish comes true.",
        body: "It is a good story, so I made it easy to tell.",
      },
    ],
  },
  {
    title: "For developers",
    features: [
      {
        title: "Sign in with GitHub.",
        body: "You already have it, and it shows your real name and face, so people trust your link. Your profile shows what you are building and what you finished.",
      },
      {
        title: "No one can lock a wish.",
        body: "If one person could claim a wish and then go quiet, the wish would be stuck. So many developers can claim the same wish, claims never run out, and you can post a link without claiming at all.",
      },
      {
        title: "An email when your app is confirmed.",
        body: "You find out the moment real people say it works.",
      },
      {
        title: "A card that shows how many people wanted it.",
        body: "“I built what 214 people wished for” says more than “I made an app”. It is something to be proud of.",
      },
      {
        title: "A place on the Builders page.",
        body: "People can find the developers who ship.",
      },
    ],
  },
  {
    title: "For everyone",
    features: [
      {
        title: "Me-too.",
        body: "This number is how developers find the apps people want most. When you tap it, the button squishes, the number rolls up and a +1 floats away, so you know it counted.",
      },
      {
        title: "Fulfilled ✓ means people checked it.",
        body: "At first, any link could mark a wish as done, even a fake one. Now the people who wanted the app decide. The person who made the wish gets the first say. If they do not vote, 3 people who tapped me-too can decide. If people say a link does not work, it gets hidden behind a warning.",
      },
      {
        title: "Filters.",
        body: "Developers can find wishes no one has built yet. Visitors can see the wishes that came true. You can also sort by newest or most wanted.",
      },
      {
        title: "This week’s numbers in plain words.",
        body: "“12 more wishes than last week” is easier to read than a chart.",
      },
      {
        title: "Live visitor count.",
        body: "The eye icon at the top shows how many people are on the site with you right now.",
      },
      {
        title: "Share anything.",
        body: "Every wish, every new app and every wish that came true has its own link and picture, so each share tells the right story. You can also download the picture.",
      },
      {
        title: "A night sky to start.",
        body: "People make wishes on shooting stars. So the first page shows a star flying in, and the sky slowly turns from night to morning and back to evening as you scroll.",
      },
      {
        title: "Friendly empty pages.",
        body: "Even a page with nothing on it has a small drawing and a button to help you move on. It should still feel like a person made it.",
      },
      {
        title: "Report a wish or a link.",
        body: "Anyone can post, so anyone can tell me when something is wrong. I read every report myself.",
      },
    ],
  },
  {
    title: "Privacy and safety",
    features: [
      {
        title: "I do not keep your IP address.",
        body: "I need to stop spam, but I do not need to know who you are. Your IP address is turned into a scrambled code, and that code is thrown away within a day.",
      },
      {
        title: "No sign-up, but still fair.",
        body: "Your phone or computer gets a random code, and I only keep a scrambled copy of it. That is how I make sure each person gets one me-too without making an account.",
      },
      {
        title: "Email links are safe to open.",
        body: "Some email apps open every link to check it. So opening a link does nothing. You have to press the button on the page.",
      },
      {
        title: "Bot checks you will not notice.",
        body: "Bots get stopped, and real people do not have to solve puzzles.",
      },
      {
        title: "Fair daily limits.",
        body: "No single person or bot can flood the site or fake how many people want something.",
      },
      {
        title: "Outside links open in a new tab.",
        body: "I do not check links before they go up. So every link shows who posted it, and it never opens inside Wishcode.",
      },
      {
        title: "Visitor counts with no cookies.",
        body: "I want to know how many people visit, not who they are.",
      },
    ],
  },
  {
    title: "Open to all",
    features: [
      {
        title: "Free and open source.",
        body: "Anyone can read the code and check that Wishcode does what this page says. You can even run your own copy.",
      },
      {
        title: "Easy for AI assistants to read.",
        body: "Many people now ask AI to find things for them. Wishcode has a simple page made for AI, so wishes can show up there too.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:py-16">
      <h1 className="font-serif text-display-sm text-ink sm:text-display">Features</h1>
      <p className="mt-4 font-serif text-[20px] leading-8 text-ink-muted italic">
        Everything Wishcode does, in one place. Some things you will see. Some things work quietly in the background. I
        added each one for a reason.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-14">
          <h2 className="font-serif text-headline font-semibold text-ink">{s.title}</h2>
          <dl className="mt-4 divide-y divide-hairline">
            {s.features.map((f) => (
              <div key={f.title} className="py-5">
                <dt className="text-[16px] leading-6 font-semibold text-ink">{f.title}</dt>
                <dd className="mt-1 text-[15px] leading-6 text-ink-muted">{f.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/wishes#compose" className="rounded-lg bg-amber px-5 py-2.5 text-label font-semibold text-on-amber hover:bg-amber-hover">
          Make a wish
        </Link>
        <Link href="/principles" className="rounded-lg bg-surface-low px-5 py-2.5 text-label font-medium text-ink hover:bg-surface-container">
          How it works
        </Link>
      </div>
    </main>
  );
}
