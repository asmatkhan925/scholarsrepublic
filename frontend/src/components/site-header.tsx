import { Navbar } from "@/components/layout/Navbar";

type SiteHeaderProps = {
  variant?: "default" | "auth";
};

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  return <Navbar variant={variant} />;
}
