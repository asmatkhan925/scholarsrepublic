import Link from "next/link";
import { GraduationCap } from "lucide-react";

const navItems = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-pine text-white">
            <GraduationCap size={20} aria-hidden="true" />
          </span>
          <span>Scholars Republic</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink/75 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-pine">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/login" className="hidden rounded px-3 py-2 text-ink hover:bg-ink/5 sm:inline-flex">
            Login
          </Link>
          <Link href="/register" className="rounded bg-pine px-4 py-2 text-white hover:bg-pine/90">
            Create Profile
          </Link>
        </div>
      </div>
    </header>
  );
}
