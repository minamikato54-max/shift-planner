# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Shift Planner（シフト希望提出・自動割当・通知アプリ）。1つの職場のスタッフ数人〜十数人と、シフトを組む管理者向け。管理者が募集期間とスロット（朝/昼/夜など必要人数付きの時間帯枠）を作成し、スタッフが日付ごとに勤務可能/不可を提出（時間は各自プロフィールの固定「基本勤務時間帯」を使う）、管理者が自動生成された下書きシフトを確認・調整して確定、確定シフトを各スタッフにGmailまたはLINEで自動通知する。部門全員が確定済みシフトをアプリ内でも閲覧できる。要件定義は`spec.md`を参照。

## Commands

- `npm run dev` — 開発サーバー起動（http://localhost:3000、使用中の場合は自動で別ポート）
- `npm run build` — 本番ビルド
- `npm run start` — 本番ビルドの起動
- `npm run lint` — ESLint実行

このプロジェクトに単体テストランナーは導入していない（nomi-checkと同様）。

## Architecture

- Next.js 16.2.10 App Router（`app/`、`src/`なし）+ TypeScript + Tailwind v4 + Firebase（Authentication: Googleログイン、Firestore: `users` / `periods` / `availabilities` / `assignments`）。詳細なスキーマは`spec.md`のデータモデル節を参照
- `lib/firebase.ts`はクライアントSDK（nomi-checkと同一パターン）。`lib/firebaseAdmin.ts`はAdmin SDK（`firebase-admin/app`・`firebase-admin/firestore`のみ）で、`getAdminDb()`という**遅延初期化の関数**として公開している（トップレベルでの即時初期化にすると、資格情報が無い環境での`next build`が失敗するため）。Admin SDKは`app/api/**`配下のみから使うこと
- **`firebase-admin/auth`は使わない（意図的・重要）**: `verifyIdToken()`は`jwks-rsa`→`jose`という依存を持つが、2026-07時点で公開されている`jose`最新版が`"type":"module"`のESM専用になっており、CJSの`jwks-rsa`から`require()`されると`ERR_REQUIRE_ESM`で落ちる。これは`next dev`では発生せず、Vercelの本番ビルド（Turbopackの外部モジュールローダー）でのみ再現する、現在未解決の上流バグ。IDトークンの検証は代わりに`lib/verifyFirebaseIdToken.ts`（純粋にCJSな`jsonwebtoken`＋Googleの公開鍵エンドポイントを直接叩く自前実装）を使うこと。`firebase-admin/auth`のimportを復活させる場合は、必ずローカルではなく実際のVercelデプロイで動作確認すること
- 通知はNodemailer（Gmail SMTP、アプリパスワード）とLINE Messaging API（本アプリ専用の新規チャネル。health-bot・他プロジェクトのLINEチャネルとは別物で、既存設定には一切触れない）。`lib/mailer.ts`・`lib/line.ts`はどちらも`server-only`
- `assignments`は1期間=1ドキュメント、ドキュメントIDに`periodId`をそのまま使う。取得は`getDoc`で直接行い、クエリを使わない。`staffNames`（uid→表示名のスナップショット）を同居させ、全員閲覧画面が他人の`users`ドキュメントを横断参照しなくて済むようにしている
- 確定（`confirmed:true`）後も管理者は手動調整（追加・削除）を続けられる。`/api/assignments/[periodId]/confirm`と`/api/assignments/[periodId]/renotify`は`lib/notifyAssignments.ts`の送信ループを共有しており、`renotify`は「確定済みであること」だけを条件に何度でも呼べる（`confirm`側の「二重送信防止トランザクション」は初回確定時のみ）
- `availabilities`はFirestore上で`where("periodId", "==", ...)`の単一条件のみで取得し、`orderBy`と組み合わせた複合クエリにしない（ソート・整形はクライアント側JSで行う、`lib/availabilities.ts`）。nomi-checkで発生した「未作成の複合インデックスによるサイレント障害」を避けるための設計判断
- `lib/dateUtils.ts`の`enumerateDates`/`dayOfWeekLabel`は**必ずUTC基準**でパース・演算すること（`...T00:00:00Z`＋`setUTCDate`/`getUTCDay`）。ローカルタイムゾーンでパースして`toISOString()`すると、JST環境では日付が1日ズレるバグが実際に発生した
- スタッフの「基本勤務時間帯」（`users.defaultShift`）はプロフィール画面で1回設定する固定値。希望提出画面（`AvailabilityGrid`）では日付ごとに時間を入力させず、OK/NGのトグルのみで、OK時は常に`defaultShift`の時刻を使う（毎回時間入力するのが面倒という要望を受けた意図的な設計）
- `lib/autoAssign.ts`の`generateDraftAssignments`はクライアント側で実行する純粋関数。対象条件・連勤上限・選出ロジックは`spec.md`の「自動割当ロジック仕様」に厳密に従うこと

## Project-specific rules（spec.mdより）

- **スコープを守る**: 以下は明示的にスコープ外なので、指示なく追加しないこと:
  - 曜日ごとに異なるスロットパターン（期間内は同一パターン固定）
  - 各スタッフの希望優先度の重み付けなど、連勤上限以外の高度な最適化
  - シフト交換・欠勤代打の募集機能、提出リマインド通知
  - 複数職場・複数店舗のマルチテナント対応
  - 提出期限による自動締切／編集ロック
  - アプリ内での管理者権限付与UI（Firebase Console手動運用）
  - LINEログイン（OAuth）による自動連携（友だち追加＋userId貼り付け方式を採用）
- **自動割当ロジック**: 対象条件・連勤上限（連続勤務最大3日）・選出ロジック・不足時の扱いは`spec.md`の「自動割当ロジック仕様」に厳密に従う。独自の最適化ロジックを追加しない
- **通知は確定時 or 明示的な再通知のみ**: 下書き段階（`confirmed = false`）では絶対に送信しない。確定後の手動調整は自動では再通知せず、管理者が「変更を全員に再通知する」ボタンを押したときだけ送信する（差分ではなく現在のbyDateをまるごと送り直す。割当から完全に外れた人には何も送られない点に注意）
- **管理者権限**: `users.role`はFirebase Console手動編集のみで変更する運用。アプリ内に権限昇格の導線を作らない
- **期間の編集・削除**: `periods`の削除は関連する`availabilities`/`assignments`をカスケード削除しない（意図的。この規模のアプリでは不要と判断）
- Firebase設定値（APIキー等）はクライアント公開用の`NEXT_PUBLIC_*`環境変数として`.env.local`に置き、コミットしない。LINEチャネルアクセストークン・Gmailアプリパスワード・Firebase Admin SDKの秘密鍵はサーバー専用の環境変数として扱い、クライアントに露出させない
- デプロイ後チェックリスト（`spec.md`の非機能要件を参照）を必ず実施すること: Firebase AuthenticationのGoogleプロバイダ有効化、Vercel本番ドメインの承認済みドメイン追加、LINE Developersコンソールでの Webhook URL登録・Verify確認、Gmailアプリパスワード発行
