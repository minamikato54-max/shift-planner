import "server-only";
import { createHmac } from "node:crypto";

const LINE_API_BASE = "https://api.line.me/v2/bot/message";

export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;

  const expected = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return expected === signature;
}

async function callLineApi(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LINE API error ${res.status}: ${detail}`);
  }
}

export async function replyLineMessage(
  replyToken: string,
  text: string,
): Promise<void> {
  await callLineApi("/reply", {
    replyToken,
    messages: [{ type: "text", text }],
  });
}

export async function pushLineMessage(
  userId: string,
  text: string,
): Promise<void> {
  await callLineApi("/push", {
    to: userId,
    messages: [{ type: "text", text }],
  });
}
