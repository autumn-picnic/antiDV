# Feedback Excel downloads

The administrator dashboard downloads the currently selected category as `.xlsx`, including all pages rather than just the visible page.

- Online messages: `id`, `createdAt`, `message`, `name`, `phone`, `wechat`, `email`.
- Chat feedback: a conversation summary worksheet and a detail worksheet containing conversation/user IDs, turn/response IDs, question, answer, score, comment and review time. Unreviewed answers have blank score/comment cells.
- Timestamps retain UTC/offset information. Phone numbers and user text remain strings, including text starting with `=`.
- Downloads reuse existing authenticated and audited administrator APIs; the designated verified primary email and admin role are still required. No database migration or additional permission is needed.
- Progress and cancellation are provided. Failed pages and lost authorization stop the download without producing a partial file. Text exceeding Excel cell limits produces a clear error instead of silent truncation.

Pagination reads current records rather than a transaction-wide snapshot. Avoid changing/deleting records during export; missing turns detected during export require a retry.

Validation: five export tests and 25 access tests passed; targeted TypeScript and ESLint passed. The export tests cover all-page pagination, string preservation, XLSX round-trip, blank scores, cancellation, failed authorization, invalid pagination and empty datasets.
