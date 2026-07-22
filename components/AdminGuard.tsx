"use client";

import { useAuth } from "@/lib/AuthContext";

// UX convenience only — this does NOT enforce security. The real permission
// boundary is the Firestore rules' isAdmin() and the confirm API route's own
// role check, both of which apply regardless of what this component renders.
export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (appUser?.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        このページには管理者権限が必要です。
      </div>
    );
  }

  return <>{children}</>;
}
