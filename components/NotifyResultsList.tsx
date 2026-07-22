type Props = {
  results: Record<string, "sent" | "failed">;
  staffNames: Record<string, string>;
};

export default function NotifyResultsList({ results, staffNames }: Props) {
  const entries = Object.entries(results);
  if (entries.length === 0) return null;

  const failed = entries.filter(([, status]) => status === "failed");
  const sent = entries.filter(([, status]) => status === "sent");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h3 className="font-semibold">送信結果</h3>
      <p>
        成功 {sent.length}件 / 失敗 {failed.length}件
      </p>
      {failed.length > 0 && (
        <ul className="text-red-600">
          {failed.map(([uid]) => (
            <li key={uid}>{staffNames[uid] ?? uid}：送信できませんでした</li>
          ))}
        </ul>
      )}
    </div>
  );
}
