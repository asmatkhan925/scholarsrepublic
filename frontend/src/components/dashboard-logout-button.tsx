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
      className="mt-6 w-full rounded bg-pine px-3 py-2 text-left text-sm font-semibold text-white hover:bg-pine/90"
    >
      Logout
    </button>
  );
}
