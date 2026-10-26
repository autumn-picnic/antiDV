# Feedback Excel downloads

The administrator dashboard downloads the currently selected category as `.xlsx`, including all pages rather than just the visible page.

- Online messages: `id`, `createdAt`, `message`, `name`, `phone`, `wechat`, `email`.
- Chat feedback: a conversation summary worksheet, a detail worksheet containing conversation/user IDs, turn/response IDs, question, answer, score, comment and review time, and a failure worksheet. Unreviewed answers have blank score/comment cells. The failure worksheet includes all pages of failed inputs, failure reasons as evaluations, error status, safe backend error codes, stage, time and optional conversation/response IDs. Failure records are also displayed below completed conversations in the chat feedback category. Error status is the client error classification (for example, 503 for an SSE error received over HTTP 200), not necessarily the transport's HTTP status.
- Timestamps retain UTC/offset information. Phone numbers and user text remain strings, including text starting with `=`.
- Downloads reuse authenticated and audited administrator APIs; the designated verified primary email and admin role are still required.
- Progress and cancellation are provided. Failed pages and lost authorization stop the download without producing a partial file. Text exceeding Excel cell limits produces a clear error instead of silent truncation.

Pagination reads current records rather than a transaction-wide snapshot. Avoid changing/deleting records during export; missing turns detected during export require a retry.

Validation: five export tests and 25 access tests passed; targeted TypeScript and ESLint passed. The export tests cover all-page pagination, string preservation, XLSX round-trip, blank scores, cancellation, failed authorization, invalid pagination and empty datasets.

## Failure recording setup

Before releasing failure recording, run `db/migrations/003_chat_failures.sql` against `CHATFLOW_DATABASE_URL` with a DDL role. Grant the frontend runtime role SELECT/INSERT on `xiaoan_chat_failures`, INSERT on `xiaoan_failure_admin_access`, and USAGE on its sequence. The write/read handlers never create tables automatically.

Failed sends report to the frontend's `/api/feedback/failures`, independently of the Chatflow backend. This covers conversation creation failures, HTTP errors, SSE errors, timeout, malformed streams and premature EOF. The original user input is saved with a safe failure summary; raw upstream exceptions, debug payloads, credentials and partial answers are excluded. Intentional stop/abort and local input validation do not create failure records. Each attempt has a unique ID; repeated submissions of the same report are idempotent. A manual generation retry is a separate attempt.

Reports are browser observations. The server derives account identity from Clerk, and client-supplied conversation/response IDs are reference labels only, never proof of ownership or a way to read another conversation. Anonymous reports are accepted with the same origin checks as online messages, including failures before a guest credential exists. Reports are stored independently of completed turns, so expiry or deletion of a conversation does not remove them. Apply the deployment's feedback retention/deletion policy to `xiaoan_chat_failures` as well.

Recording requires the frontend and PostgreSQL to remain reachable. A failed report displays “失败记录暂未保存”; no sensitive input is queued in browser storage. Closing the page before the failure is observed cannot be recorded. Historical failures from before this feature cannot be reconstructed from completed turns. If a stream disconnects after the backend commits, the report remains an interrupted browser request; the existing recovery flow can still restore the completed response.
