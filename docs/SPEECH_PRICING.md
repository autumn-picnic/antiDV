<!-- markdownlint-disable MD013 -->
# 小安語音輸入價格

2026-11-01，日本東，USD 隨用隨付零售快照；實際帳單以合約、促銷、稅金與有效 meter 為準。

| 服務 | 單價 | 1,000 音訊小時 |
| --- | ---: | ---: |
| Fast Transcription（本 PR 自動模式） | US$0.36／音訊小時 | US$360 |
| Standard 即時辨識（上一版） | US$1.00／音訊小時 | US$1,000 |
| Batch | US$0.18／音訊小時 | US$180 |
| Custom Fast | US$0.45／音訊小時 | US$450 |

目前只用標準 Fast，不開 Enhanced Mode、Custom 模型或 GPU。10 秒一段約 US$0.001；55 秒一段約 US$0.0055。
重試會再次產生識別用量；每進程 4 個同時請求、每身分每分鐘 12 次（訪客共用桶）沿用既有防線，未當作全站帳單硬上限。

公開 Retail API 快照另有 Fast Promo US$0.10／小時，這是獨立促銷 meter，此處沒有假設所有請求都適用。
原始費率與更多選項見 [完整比較報告](research/asr-trial-2026-11-01/comparison/REPORT.md)。

## 錄音保存

WAV 單聲道 16kHz PCM16，每秒 32,000 bytes，另加每檔 44 bytes：

- 55 秒為 1,760,044 bytes，約 1.76 MB。
- 累積 1 小時約 0.1152 GB；1,000 小時約 115.2 GB，另加每檔檔頭、資料列、索引與資料庫備份。
- 使用現有 feedback PostgreSQL 已配置容量，沒有新增 Blob 或另一套資料庫。容量有餘裕時不因插入資料就新增一份固定資料庫月費；擴容、備份超額或增加效能層級會帶來額外費用。
- 目前沒有自動到期清理，容量隨錄音累積。未實測 TOAST、索引與備份的放大比例，也沒有以推測數字報告為實際帳單。

資料庫每 GB 月的增量費用取決於現有 SKU、配置容量、備份及合約。估算公式為「新增需計費 GB × 實際 GB 月單價」，不把 Speech 音訊小時價格套到儲存。
Web 容器持續使用既有 xiaoan-web，沒有新增固定實例；額外 CPU／流量成本取決於使用量。

## Qwen 自建對照

日本東 NC4as_T4_v3 Linux VM 純算力約 US$0.710／開機小時，730 小時約 US$518.30。
Container Apps T4 以 8 vCPU＋56GiB 配置估算約 US$1.6776／副本運行小時，730 小時約 US$1,224.65。
這些是開機時間，不是音訊時間。模型未在 Azure 部署；scale-to-zero 可行性、冷啟動與額外磁碟等見 [首輪研究](research/asr-trial-2026-11-01/README.md)。

來源：[Speech 價格](https://azure.microsoft.com/en-us/pricing/details/speech/)、[Azure Retail API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)、[PostgreSQL 價格](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)。
