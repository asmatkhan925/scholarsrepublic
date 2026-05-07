import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-xl content-center px-4 py-12">
        <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Create Free Profile</h1>
          <p className="mt-2 text-sm text-ink/65">Registration API and validation will be added in Phase 2.</p>
          <form className="mt-6 grid gap-4">
            <input className="rounded border border-ink/15 px-4 py-3" placeholder="Full name" />
            <input className="rounded border border-ink/15 px-4 py-3" placeholder="Email address" type="email" />
            <input className="rounded border border-ink/15 px-4 py-3" placeholder="Password" type="password" />
            <button className="rounded bg-pine px-4 py-3 font-semibold text-white" type="button">
              Register
            </button>
          </form>
          <p className="mt-5 text-sm text-ink/65">
            Already registered? <Link href="/login" className="font-semibold text-pine">Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
