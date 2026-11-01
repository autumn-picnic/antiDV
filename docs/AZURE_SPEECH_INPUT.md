<!-- markdownlint-disable MD013 -->
# 語音接入目前版本

本 PR 已改為無語言選項的 Fast Transcription 自動識別，原始錄音保存至 feedback 共用 PostgreSQL。
目前行為以 [錄音整合設計](SPEECH_RECORDING_DESIGN.md)、[價格](SPEECH_PRICING.md) 為準。
以下保留上一版 Standard 接入與驗收紀錄，當時的「錄音不保存」及語言選擇描述已由本 PR 取代。

---

# 小安語音輸入接入

2026-11-01：已完成語音輸入、本地瀏覽器驗收與日本東 Azure 呼叫驗證。發布狀態另見部署驗收紀錄。

## 使用流程

chat 輸入框發送鍵旁新增麥克風。可選普通話、粵語或四川話；點擊後才請求麥克風權限。錄音最多 55 秒，點停止後進行轉寫；取消會停止麥克風並取消未完成請求。完成文字附加到輸入框的最新草稿，使用者可修改後按發送或 Enter。錄音／轉寫中禁止發送，不會自動提交聊天。

切換對話、登入狀態改變、頁面隱藏／離開及快速離開時，停止收音、取消轉寫並丟棄遲到結果。既有文字不會被轉寫覆蓋；若附加後超過 4,000 字則顯示提示，不截斷草稿或自動發送。錄音只在本次瀏覽器記憶體與伺服器請求記憶體中處理；應用不寫入磁碟、資料庫、localStorage 或診斷日誌。音訊仍會傳送至日本東 Azure Speech 處理。

## 配置

伺服器環境變數（不得使用 NEXT_PUBLIC 前綴）：

```dotenv
AZURE_SPEECH_REGION=japaneast
AZURE_SPEECH_KEY=<日本東 Speech 資源金鑰>
```

本地 `.env.local` 已設定為日本東專用資源 `xiaoan-speech-trial-jpe-20261101`，檔案受 git ignore 保護。發布時將 `AZURE_SPEECH_KEY` 存為 Container Apps secret `azure-speech-key`；GitHub Actions 更新映像時以 secretRef 引用，並設定 region。流程先檢查 Container App 位於 Japan East 且 secret 存在。使用現有日本東小安資源群組 `xiaoan-pilot-rg`，不另建跨區端點。

固定上游為 `https://japaneast.stt.speech.microsoft.com/`。後端 `/api/speech/transcribe` 使用 Speech Standard short-audio REST，只回傳 final 文字；沒有邊說邊轉寫功能。語音費用依先前日本東零售價約 US$1／音訊小時。金鑰缺失或 region 非 japaneast 時回覆 503，保留文字輸入。

## 程式與限制

- `hooks/use-speech-input.ts`：錄音生命週期、取消、轉寫及防止遲到結果。
- `public/speech-recorder.worklet.js`：Web Audio worklet 收音；輸出靜音，避免麥克風回授。
- `utils/speech-audio.ts`：轉為 16kHz mono PCM16 WAV、55 秒／大小限制及後端格式驗證。
- `app/api/speech/transcribe/route.ts`：同源檢查、既有 Clerk 可選身分驗證、流式讀取大小上限、25 秒上游逾時、取消傳遞、不外洩供應商診斷。
- `next.config.js`：僅 chat 路徑允許同源麥克風，其他頁維持禁止；仍需使用者操作與瀏覽器授權。

支援 HTTPS 或 localhost，需具備 AudioContext／AudioWorklet／getUserMedia 的瀏覽器。這次未安裝額外套件。每個進程限制最多 4 個同時轉寫、每登入使用者每分鐘 12 次；訪客共用每分鐘 12 次的保守額度。這是單進程防線，多副本的全站共享配額需於 ingress／API gateway 配置，現有本地檢查不能替代全站共享計費上限。

## 驗證紀錄

2026-11-01：

- 94 項語音、聊天停止／草稿、權限及 chatflow 回歸測試通過；TypeScript、針對變更程式的 ESLint、worklet 語法與 diff 空白檢查通過。
- 瀏覽器真實鏈路：公開普通話錄音透過 MediaStream → 實際 AudioWorklet → WAV 編碼器 → 既有 Clerk middleware → 新 API → 日本東 Speech，兩次 HTTP 200。辨識到「陈增新说，他打电话让对方拿回去。」；長片段循環播放用於上限測試。
- 點停止及 55 秒自動停止均成功轉寫。原草稿保留並附加文字，發送觀測值維持空，只有核對、修改並點發送後才提交修改後文字。
- 瀏覽器故障注入：權限拒絕、503 服務失敗、取消正在轉寫的延遲回應，以及切換對話取消收音；草稿保留、軌道停止、發送恢復，遲到文字未加入草稿。
- 390×844 手機 viewport 無水平溢出，語音／發送／取消控制可見。此為桌面瀏覽器的手機版面模擬，實體 iOS／Android 的裝置權限與音質仍需真機試用。
- 測試頁及公開音訊僅置於本地臨時驗收環境，已移出發布樹，不會隨網站部署。瀏覽器驗收以公開音訊替代實體麥克風，未採集使用者的私人錄音。故障注入只替換測試環境的裝置與網路回應，正式語音元件未加入測試分支。

完整 `next build` 已成功（既有 Next 內建 lint 選項不相容警告，變更檔案另用獨立 ESLint 通過）。發佈後另核對 Actions、遠端提交、Azure ready revision／100% 流量、正式站語音 API 及 chat 頁面。這些結果記於本次發布回覆及本地 `docs/deployment/AZURE_SPEECH_RELEASE_20261101.md`。
