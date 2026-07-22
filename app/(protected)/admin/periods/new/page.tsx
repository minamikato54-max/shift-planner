"use client";

import PeriodForm from "@/components/PeriodForm";
import { useAuth } from "@/lib/AuthContext";

export default function NewPeriodPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">募集期間の作成</h1>
      <PeriodForm createdBy={user.uid} />
    </div>
  );
}
