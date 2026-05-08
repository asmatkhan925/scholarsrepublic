"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

export function DashboardLogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-6 w-full rounded border border-ink/10 px-3 py-2 text-left text-sm font-semibold text-ink/70 hover:bg-rose-50 hover:text-rose-700"
    >
      Logout
    </button>
  );
}
