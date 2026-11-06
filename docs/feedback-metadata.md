# 反饋管理：時間、IP 地點與 Debug 留存

每輪已完成對話的 `account_turns.content.request_context` 保存開始／完成時間（Unix 秒）、用戶 IP、國家、地區、城市及來源。管理頁以 UTC+8 顯示時間，地點標示為 IP 推測。歷史未保存的資料顯示未記錄／未取得。

Vercel 環境採用平台提供的 `x-vercel-forwarded-for` 和 IP 地理位置請求頭，Azure Container Apps 環境採用 Azure 追加的 X-Forwarded-For 最右側 IP，透過 GeoJS HTTPS API 推測國家／地區／城市（只傳送 IP，不傳送對話內容；超時 1.2 秒後放棄查詢並保留 IP）。參考：[Vercel request headers](https://vercel.com/docs/headers/request-headers)。本地或其他未識別平台環境不採信客戶端自行提供的地理位置請求頭。

前端 `FEEDBACK_CONTEXT_SECRET` 和後端 `XIAOAN_FEEDBACK_CONTEXT_SECRET` 須設定相同的伺服器密鑰（使用高強度隨機值，不帶 NEXT_PUBLIC 前綴）。前端以 HMAC-SHA256 簽名，後端驗證後才接受 IP 地點；未配置或驗證失敗仍保存時間，IP 地點留空。密鑰只透過現有部署密鑰機制配置。

後端默認收集 Debug，隨對話存於 `content.debug`，管理端經既有管理員權限和讀取審計展示所有字段。普通聊天回覆仍受原本 Debug 權限及請求開關限制。沿用對話現有留存、到期清理及臨時模式，不額外建立永久副本；無需資料庫結構遷移。

修改涉及 frontend 與 xiaoan 後端兩個倉庫，需協同發布；GitHub Actions 使用 Key Vault 的 `xiaoan-feedback-context-secret`，前後端均綁定相同的版本無關 secret 引用。
