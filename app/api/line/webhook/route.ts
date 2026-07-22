import { replyLineMessage, verifyLineSignature } from "@/lib/line";

type LineEvent = {
  type: string;
  replyToken?: string;
  message?: { type: string };
  source?: { userId?: string };
};

// Friend-add linking flow: a staff member adds this app's dedicated LINE
// official account and sends any text message; we reply with their own
// userId so they can paste it into the profile screen. No LINE Login/OAuth
// involved (deliberately simplified, per spec.md).
export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifyLineSignature(rawBody, req.headers.get("x-line-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  const { events } = JSON.parse(rawBody) as { events?: LineEvent[] };

  for (const event of events ?? []) {
    try {
      if (
        event.type === "message" &&
        event.message?.type === "text" &&
        event.replyToken &&
        event.source?.userId
      ) {
        await replyLineMessage(
          event.replyToken,
          `あなたのuserIdは以下です。プロフィール画面に貼り付けてください:\n${event.source.userId}`,
        );
      }
    } catch (err) {
      // Swallow per-event errors — LINE retries the whole webhook call on a
      // non-2xx response, so one bad event must not fail the others.
      console.error("LINE webhookの返信に失敗しました", err);
    }
  }

  return new Response("OK", { status: 200 });
}
