import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | Scholars Republic",
  description:
    "Learn how Scholars Republic collects, uses, and protects student account, profile, saved scholarship, application tracker, and site usage information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-cream/35">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">Privacy Policy</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70 md:text-base">
          Scholars Republic helps students discover scholarship opportunities, save useful
          resources, track applications, and prepare scholarship documents. This policy explains
          what information we collect and how it is used.
        </p>
        <p className="mt-3 text-sm text-ink/55">Last updated: May 14, 2026</p>

        <article className="mt-10 space-y-9 text-sm leading-7 text-ink/72 md:text-base">
          <section>
            <h2 className="text-xl font-bold text-ink">Information We Collect</h2>
            <p className="mt-3">
              We collect information needed to operate Scholars Republic and provide student
              services. This may include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account information such as name, email address, password, and account status.</li>
              <li>
                Profile information such as education level, fields of study, target countries,
                documents, and scholarship preferences.
              </li>
              <li>Saved scholarships and other saved opportunity data.</li>
              <li>Application tracker data that you choose to add to your account.</li>
              <li>
                Comments on scholarship pages and support or contact messages you choose to send,
                where those features are available.
              </li>
              <li>
                Basic analytics and log data, such as pages visited, browser information, device
                information, IP address, and error logs.
              </li>
            </ul>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">How We Use Information</h2>
            <p className="mt-3">We use information to provide and improve the website, including:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Creating, securing, and managing account access.</li>
              <li>Showing scholarship recommendations and relevant opportunities.</li>
              <li>Saving opportunities and supporting application tracking.</li>
              <li>Responding to support requests and improving site reliability.</li>
              <li>Understanding how students use the site so we can improve features and content.</li>
            </ul>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Cookies and Local Storage</h2>
            <p className="mt-3">
              Scholars Republic may use cookies and browser local storage for essential login,
              session, security, and site functionality. You can control cookies through your
              browser settings, but disabling essential storage may prevent some features from
              working correctly.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Advertising</h2>
            <p className="mt-3">
              If advertising is enabled on Scholars Republic, third-party vendors including Google
              may use cookies to serve ads based on a user&apos;s prior visits to this website
              and/or other websites. Users may control ad personalization through their browser,
              device, and advertising settings, including Google&apos;s ad personalization controls.
            </p>
          </section>

          <section className="border-t border-ink/10 pt-8">
            <h2 className="text-xl font-bold text-ink">Your Choices</h2>
            <p className="mt-3">
              You can use browser controls to manage cookies and site storage. You can also update
              information in your account profile where supported. For privacy questions, contact us
              through the{" "}
              <Link href="/contact" className="font-semibold text-pine hover:text-pine/80">
                contact page
              </Link>
              .
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
