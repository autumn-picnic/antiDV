<!-- markdownlint-disable MD013 -->
# 語音輸入、原始錄音與 feedback 整合

2026-11-01。本次改動包含無語言選單的自動轉寫、麥克風權限邀請、原始 WAV 保存及 feedback 管理員播放。

## 使用流程

點麥克風先開權限邀請彈窗，說明錄音保存用途。點「允許並開始錄音」才執行 getUserMedia；首次使用仍由瀏覽器原生提示授權。
已封鎖權限時，彈窗指引使用者在網站／系統設定開啟並重試。網頁無法直接替使用者修改被封鎖的權限，也不會謊報已設定成功。

錄音最多 55 秒，停止後自動上傳轉寫；取消尚未提交的錄音不會上傳。轉寫只加入現有草稿，不自動發送。使用者可核對和修改，再按發送。
前端移除語言選單與常駐「點擊麥克風錄音，轉寫後核對並發送」提示；錄音計時、取消、轉寫狀態和錯誤仍會顯示。

## 自動識別

使用 Japan East Fast Transcription API `2025-10-15`，伺服器不傳 locales，讓 Azure 多語模型自動處理。
固定區域 URL：`https://japaneast.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe`。
沿用日本東 `xiaoan-speech-trial-jpe-20261101`，金鑰只在 Container Apps secret；region 非 japaneast 則拒絕服務。

普通話、四川話與粵語公開樣本均 HTTP 200；粵語輸出偏書面普通話，三段均回傳 zh-CN 標籤。
此模式不保證識別具體方言名稱或保留全部方言字形。詳見 [實測與限制](research/asr-trial-2026-11-01/automatic/REPORT.md)。

## 保存格式與狀態

「原始錄音」指瀏覽器提交給 Speech 的完整 WAV 檔案，逐位元組保存，不是由轉寫文字重新合成。
錄音器會先將麥克風樣本轉成單聲道 16kHz PCM16；沒有另外保存裝置原生高取樣率或未降噪資料。SHA-256 可核對保存內容。

原有 `CHATFLOW_DATABASE_URL` 連到 feedback 共用 PostgreSQL。新增 `xiaoan_speech_recordings`：

- 伺服器生成 UUID、身分 userId／訪客 NULL、WAV bytea、SHA-256、長度與時長。
- 先保存音訊，狀態 processing，再呼叫 Azure；完成後寫 success／failed／cancelled、原始轉寫、供應商語言標籤、受控錯誤與完成時間。
- 保存失敗即回覆錯誤，不會先轉寫再無聲丟失錄音。異常中止進程可能留下 processing，供後台辨識未完成請求。
- 超過大小、格式錯誤或取消尚未提交的錄音不保存。上傳後取消可能已保存音訊，會盡力記錄 cancelled。
- 這是識別前後的紀錄，與最終編輯後發送的聊天文字分開；目前不建立會話／回答外鍵，也不聲稱原始轉寫就是最終訊息。

錄音與 feedback 獨立保存，目前不自動到期；聊天的 30 天保存設定、清空聊天或快速離開不會刪除此評估紀錄。
麥克風邀請彈窗會告知獨立保存規則。需要自動清理或使用者刪除錄音時，應另訂並實作保存政策；目前不虛構已具備的自動到期能力。

## 後台與權限

`/feedback` 新增「語音錄音」頁籤，最多 50 筆一頁，顯示時間、處理狀態、時長、大小、身分、原始轉寫及載入播放按鈕。
列表不回傳音訊；只有點載入並播放才向保護的 API 取得 WAV。支援 Range／206 拖動，禁止快取，沒有公開錄音 URL。

`GET /api/feedback/speech` 與 `GET /api/feedback/speech/:id` 沿用 requireActor(true)：有效 Clerk 會話、admin 角色與指定已驗證主郵箱。
列表與播放均寫入 `xiaoan_speech_admin_access` 審計，只有 actor、錄音 ID、動作及時間，不把音訊或轉寫寫入日誌。
普通用戶和訪客無法讀取音訊，即使知道 UUID。管理員播放可取得完整原始錄音，因此不宣稱能阻止有權讀取者另存。

## 遷移與發布

先執行 `db/migrations/004_speech_recordings.sql`。新表和索引可重跑；只授予現有 xiaoan_feedback_web 在錄音表 SELECT／INSERT／UPDATE、審計表 INSERT 與序列 USAGE。
不新增資料庫、儲存帳戶、GPU 或跨區服務，不增加套件。應用請求不執行 DDL。

通過錄音、權限、音訊 Range、狀態寫入、UI 及回歸驗證後，透過同一 PR 提交程式、設計、價格和原離線比較報告，合併 main 觸發既有 Actions。
