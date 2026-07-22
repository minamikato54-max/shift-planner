# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Shift Planner（シフト希望提出・自動割当・通知アプリ）。1つの職場のスタッフ数人〜十数人と、シフトを組む管理者向け。管理者が募集期間とスロット（朝/昼/夜など必要人数付きの時間帯枠）を作成し、スタッフが日付ごとに勤務可能な時間帯を提出、管理者が自動生成された下書きシフトを確認・調整して確定、確定シフトを各スタッフにGmailまたはLINEで自動通知する。要件定義は`spec.md`を参照（誰の・何を・どう解決するか、コア機能、自動割当ロジック仕様、通知機能仕様、スコープ外、データモデル、画面構成を定義済み）。

まだ実装（`npm create next-app`等の初期セットアップ）は行っていない。以下は`spec.md`の技術スタックに基づく、実装時に使う予定のコマンド・構成。

## Commands（実装後に使用）

- `npm run dev` — 開発サーバー起動（http://localhost:3000）
- `npm run build` — 本番ビルド
- `npm run start` — 本番ビルドの起動
- `npm run lint` — ESLint実行

このプロジェクトに単体テストランナーは導入しない予定（nomi-checkと同様）。

## Architecture

- Next.js App Router（`app/`ディレクトリ）+ TypeScript + Tailwind CSSを想定（nomi-checkと同じ構成）
- 認証・データ永続化はFirebase（Authentication: Googleログイン、Firestore: `users` / `periods` / `availabilities` / `assignments`コレクション）。詳細なスキーマは`spec.md`のデータモデル節を参照
- 通知はNodemailer（Gmail SMTP、アプリパスワード）とLINE Messaging API（本アプリ専用の新規チャネル。health-bot・他プロジェクトのLINEチャネルとは別物で、既存設定には一切触れない）
- `assignments`は1期間=1ドキュメントとし、ドキュメントIDに`periodId`をそのまま使う設計。取得は`getDoc`で直接行い、クエリを使わない
- `availabilities`はFirestore上で`where("periodId", "==", ...)`の単一条件のみで取得し、`orderBy`と組み合わせた複合クエリにしない（ソート・整形はクライアント側JSで行う）。nomi-checkで発生した「未作成の複合インデックスによるサイレント障害」を避けるための設計判断

## Project-specific rules（spec.mdより）

- **スコープを守る**: 以下は明示的にスコープ外なので、指示なく追加しないこと:
  - 曜日ごとに異なるスロットパターン（期間内は同一パターン固定）
  - 各スタッフの希望優先度・連続勤務制限などを考慮した高度な最適化
  - シフト交換・欠勤代打の募集機能、提出リマインド通知
  - 複数職場・複数店舗のマルチテナント対応
  - 提出期限による自動締切／編集ロック
  - アプリ内での管理者権限付与UI（Firebase Console手動運用）
  - LINEログイン（OAuth）による自動連携（友だち追加＋userId貼り付け方式を採用）
- **自動割当ロジック**: 対象条件・選出ロジック・不足時の扱いは`spec.md`の「自動割当ロジック仕様」に厳密に従う。独自の最適化ロジックを追加しない
- **通知は確定時のみ**: シフト確定（`assignments.confirmed = true`）をトリガーにのみ送信する。下書き段階や再編集のたびに通知を送らない
- **管理者権限**: `users.role`はFirebase Console手動編集のみで変更する運用。アプリ内に権限昇格の導線を作らない
- Firebase設定値（APIキー等）はクライアント公開用の`NEXT_PUBLIC_*`環境変数として`.env.local`に置き、コミットしない。LINEチャネルアクセストークン・Gmailアプリパスワードはサーバー専用の環境変数として扱い、クライアントに露出させない
- デプロイ後チェックリスト（`spec.md`の非機能要件を参照）を必ず実施すること: Firebase AuthenticationのGoogleプロバイダ有効化、Vercel本番ドメインの承認済みドメイン追加、LINE Developersコンソールでの Webhook URL登録・Verify確認、Gmailアプリパスワード発行
