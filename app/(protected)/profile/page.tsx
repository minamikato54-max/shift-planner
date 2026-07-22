"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateDefaultShift, updateNotifySettings } from "@/lib/users";
import type { NotifyChannel } from "@/lib/types";

export default function ProfilePage() {
  const { user, appUser } = useAuth();

  const [notifyChannel, setNotifyChannel] = useState<NotifyChannel>("gmail");
  const [lineUserId, setLineUserId] = useState("");
  const [defaultStart, setDefaultStart] = useState("");
  const [defaultEnd, setDefaultEnd] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync local form state from the loaded appUser once, on the null -> loaded
  // transition. Done during render (React's documented "adjusting state"
  // pattern) rather than in an effect, so it doesn't clobber in-progress
  // edits on every live onSnapshot update of appUser.
  const [initializedForUid, setInitializedForUid] = useState<string | null>(
    null,
  );
  if (appUser && appUser.uid !== initializedForUid) {
    setInitializedForUid(appUser.uid);
    setNotifyChannel(appUser.notifyChannel);
    setLineUserId(appUser.lineUserId ?? "");
    setDefaultStart(appUser.defaultShift?.start ?? "");
    setDefaultEnd(appUser.defaultShift?.end ?? "");
  }

  async function handleSave() {
    if (!user) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await updateNotifySettings(user.uid, {
        notifyChannel,
        lineUserId:
          notifyChannel === "line" ? lineUserId || null : lineUserId || null,
      });
      await updateDefaultShift(
        user.uid,
        defaultStart && defaultEnd
          ? { start: defaultStart, end: defaultEnd }
          : null,
      );
      setSaved(true);
    } catch (err) {
      console.error("プロフィールの保存に失敗しました", err);
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">プロフィール</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-500">通知設定</h2>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="notifyChannel"
            checked={notifyChannel === "gmail"}
            onChange={() => setNotifyChannel("gmail")}
          />
          Gmailで受け取る
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="notifyChannel"
            checked={notifyChannel === "line"}
            onChange={() => setNotifyChannel("line")}
          />
          LINEで受け取る
        </label>

        {notifyChannel === "line" && (
          <div className="ml-6 flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="text-zinc-500">
              1. 公式アカウントを友だち追加する
              <br />
              2. 何かメッセージを送ると、あなたのuserIdが返信されます
              <br />
              3. そのuserIdを下に貼り付けて保存してください
            </p>
            <input
              type="text"
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              placeholder="LINEのuserId"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            {appUser?.lineUserId && (
              <p className="text-xs text-green-600">連携済みです</p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-500">
          基本勤務時間帯（希望提出画面の初期値になります）
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={defaultStart}
            onChange={(e) => setDefaultStart(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span>〜</span>
          <input
            type="time"
            value={defaultEnd}
            onChange={(e) => setDefaultEnd(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <p className="text-xs text-zinc-500">
          未入力の場合、希望提出時に初期値は表示されません。
        </p>
      </section>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {pending ? "保存中..." : "保存する"}
        </button>
        {saved && <p className="mt-2 text-sm text-green-600">保存しました</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
