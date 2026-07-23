"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPeriod, updatePeriod } from "@/lib/periods";
import type { Period, Slot } from "@/lib/types";

const emptySlot: Slot = {
  name: "",
  start: "09:00",
  end: "17:00",
  requiredCount: 1,
};

type Props =
  | { createdBy: string; editingPeriod?: undefined }
  | { createdBy?: undefined; editingPeriod: Period };

export default function PeriodForm(props: Props) {
  const { editingPeriod } = props;
  const router = useRouter();
  const [title, setTitle] = useState(editingPeriod?.title ?? "");
  const [startDate, setStartDate] = useState(editingPeriod?.startDate ?? "");
  const [endDate, setEndDate] = useState(editingPeriod?.endDate ?? "");
  const [slots, setSlots] = useState<Slot[]>(
    editingPeriod?.slots.length ? editingPeriod.slots : [{ ...emptySlot }],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function addSlot() {
    setSlots((prev) => [...prev, { ...emptySlot }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const input = {
      title,
      startDate,
      endDate,
      slots: slots.filter((s) => s.name.trim() !== ""),
    };
    try {
      if (editingPeriod) {
        await updatePeriod(editingPeriod.id, input);
      } else {
        await createPeriod(props.createdBy, input);
      }
      router.push(`/admin/periods`);
    } catch (err) {
      console.error("募集期間の保存に失敗しました", err);
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">タイトル</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 8月前半"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">開始日</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <span className="mt-6">〜</span>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">終了日</label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          スロット（朝/昼/夜など、期間内の全日に共通で適用）
        </label>
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={slot.name}
              onChange={(e) => updateSlot(i, { name: e.target.value })}
              placeholder="スロット名（例: 朝）"
              className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="time"
              value={slot.start}
              onChange={(e) => updateSlot(i, { start: e.target.value })}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            〜
            <input
              type="time"
              value={slot.end}
              onChange={(e) => updateSlot(i, { end: e.target.value })}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="number"
              min={1}
              value={slot.requiredCount}
              onChange={(e) =>
                updateSlot(i, { requiredCount: Number(e.target.value) })
              }
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-500">人</span>
            <button
              type="button"
              onClick={() => removeSlot(i)}
              className="text-sm text-red-600 hover:underline"
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSlot}
          className="self-start text-sm text-blue-600 hover:underline"
        >
          + スロットを追加
        </button>
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {pending
            ? "保存中..."
            : editingPeriod
              ? "変更を保存する"
              : "募集期間を作成する"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
