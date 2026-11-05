# 本機前後端開發

2026-11-05 已將本機 Git 基準對齊 Azure 已發布前端，並接通獨立本機後端。

## 版本基準

- Azure 前端：`xiaoan-web--0000070`。
- 發布映像標籤／本機 HEAD：`513a751540667b7c5d3137992ee8e81b69a87fa8`。
- 本機分支：`codex/azure-aligned-accessibility`。
- 原本的無障礙實作及其他未提交工作保留為工作樹差異；工作樹包含這些修改，因此畫面會比上述發布版本多出尚未發布的功能。
- 對齊前的檔案快照位於 `/var/folders/4l/mjqp680s3ld1jxwcfps_43800000gn/T/xiaoan-align-vrsgg3ue`，包含 `manifest.json` 和原始檔備份。此為暫存備份，長期保留應另外存檔。

本次沒有推送或部署，也沒有更動 Azure 環境變數及資料庫。

## 啟動

在前端專案目錄開啟兩個終端。沿用相鄰 `xiaoan` 專案已有的 Python 虛擬環境和原生帳號／聊天 API：

```sh
cd /Users/mingjiexing/frontend
/Users/mingjiexing/xiaoan/.venv/bin/python scripts/dev-backend.py
```

```sh
cd /Users/mingjiexing/frontend
pnpm dev --hostname localhost --port 3000
```

瀏覽器開啟 `http://localhost:3000`。後端只監聽 `127.0.0.1:8000`；終端按 Ctrl+C 停止。

前端 `.env.local` 使用以下本機路由，並保留既有的 Clerk 開發測試金鑰：

```dotenv
BACKEND_API_URL=http://127.0.0.1:8000
FRONTEND_ORIGIN=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` 是先前 Dify 整合留下的設定，目前的原生聊天代理使用 `BACKEND_API_URL`。Azure 的 `http://xiaoan-api` 是容器內部位址，本機應使用上述 loopback 位址。

## 開發模式與真實模型

預設啟動實際帳號、會話、隱私及串流 API，聊天內容使用離線開發回覆。資料寫入前端 `.local-backend/accounts.db`，該目錄已由 Git 和 Docker 忽略。啟動器清除繼承的後端／模型環境變數，使用本機資料庫和 Clerk 測試設定。

需要真實模型時，加上 `--live`：

```sh
/Users/mingjiexing/xiaoan/.venv/bin/python scripts/dev-backend.py --live
```

此選項明確載入相鄰後端 `tech/chatflow/poc/.env` 中允許的模型設定，並會向其中配置的供應商發送請求。2026-11-05 檢查發現該檔案的 `XIAOAN_RESPONSE_API_KEY` 為空，所以啟動器會停止並提示補齊；本次未驗證真實模型呼叫。Clerk 登入及語音供應商流程亦需各自驗證。

## 已驗證

2026-11-05 透過本機前端代理，以合成訊息驗證：

- 後端 `/health/live`、`/health/ready`：200。
- 前端 `/v1/conversations`、`/v1/privacy/options`：200。
- 建立訪客會話：201。
- 訪客串流回覆：200，事件包含 `start`、`delta`、`completed`。
- 對齊後的聊天 TypeScript 檢查及 `git diff --check` 通過。

先前 503 的直接原因是本機缺少 `BACKEND_API_URL`，並非前端仍從 Azure 讀取舊檔案。本次同時修正本機 Git 基準落後和開發環境設定未跟隨整合方式遷移的問題。
