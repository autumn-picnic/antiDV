<!-- markdownlint-disable MD013 -->
# 小安 ASR 首輪試用與日本東部署成本

更新：同日已發布 Standard 語音輸入；本 PR 改為 Fast Transcription 自動模式並保存錄音。原試用結果是接入前的歷史快照，以下「未改正式流程」描述屬當時狀態。新增 [自動識別補測](automatic/REPORT.md)、[接入設計](../../SPEECH_RECORDING_DESIGN.md) 與 [目前價格](../../SPEECH_PRICING.md)。

日期：2026-11-01。部署約束：所有後續自建 ASR 端點統一位於 Japan East、日本東的小安資源群組 `xiaoan-pilot-rg`。本次沒有把 GPU 或新 ASR 端點部署至正式服務。

後續多片段結果：[Azure Speech 與 Qwen 對比報告](comparison/REPORT.md)，以及 [內嵌全部錄音的離線報告](comparison/report.html)。已測 19 段；日本東 Speech Standard 完成全部結果，Qwen 官方 demo 只有 2 段完成，其餘服務錯誤。新增日本東專用 Speech 按量測試資源，沒有改動正式流程。最新 Speech 價格與 Qwen scale-to-zero／冷啟動研究亦在此報告。

## 試用結果

已向三個候選實際發送同一段 5.616 秒公開中文音訊，成功取得兩個開源模型 demo 及 MAI 新加坡端點輸出；日本東 MAI 請求未成功。這是連通性 smoke test，並非方言準確率評測，也未測 Azure GPU 吞吐或串流延遲。

公開音訊：[FunAudioLLM 官方範例 zh.mp3](https://huggingface.co/FunAudioLLM/Fun-ASR-Nano-2512/resolve/main/example/zh.mp3)。副本：`evidence/public-zh-sample.mp3`；SHA-256：`0e64de19e4ff9a02e682955c9112f32d2317cfdbb5bc2f3504664044c993f195`。未使用私人錄音。

| 候選 | 實際試用路徑 | 原始輸出／狀態 |
|---|---|---|
| Qwen3-ASR-1.7B | Qwen 官方 Hugging Face demo，非 Azure 部署 | `開放時間：早上九點至下午五點。` |
| Fun-ASR-Nano-2512 | FunAudioLLM 官方 Hugging Face demo，非 Azure 部署 | `开饭时间早上九点至下午五点。`；服務回報處理 6.10 秒、RTF 1.0857 |
| MAI-Transcribe-2 | 本輪建立的新加坡 Speech S0 試用資源 | HTTP 200；`开放时间早上 9 点至下午 5 点。` |
| MAI-Transcribe-2 | 日本東現有 AIServices 端點，API `2025-10-15` | HTTP 400；`InvalidRequest: Enhanced mode with model is currently not supported yet.` |

Qwen 與 MAI 的「開放時間」一致，Fun 輸出「開飯時間」，顯示值得放入辨音檢查的差異；尚無人工逐字標註，不以單句計算 CER 或宣布模型勝負。Fun demo 使用 CPU，Qwen demo 使用 ZeroGPU；兩者硬體不同，RTF 不可直接當 Azure GPU 效能比較。MAI 回應的 `confidence: 0` 未被當成品質分數。

官方 demo 識別：Qwen Space SHA `0a602022ecc4a9255127a94e57fbb1e2056d717c`，程式載入 `Qwen/Qwen3-ASR-1.7B`；Fun Space SHA `5b4274e1832ae741550be580f504def4da897c0e`，載入 `FunAudioLLM/Fun-ASR-Nano-2512`。demo 來源：[Qwen](https://huggingface.co/spaces/Qwen/Qwen3-ASR)、[FunAudioLLM](https://huggingface.co/spaces/FunAudioLLM/Fun-ASR-Nano)。

原始輸出均保存在 evidence。第二段錄音與靜音僅完成部分準備，未產出轉寫結果，不納入已測樣本。

## 區域修正與 MAI 限制

在使用者明確要求日本東前，本輪曾建立新加坡 `xiaoan-asr-trial-20261101`，只完成一次上述短音訊請求。收到區域要求後已刪除其活動資源，並用資源清單確認已無該名稱。Cognitive Services 刪除可能保留可恢復的軟刪除紀錄；未執行永久 purge。既有 West US 3 資源未作變更。

日本東現有 `xiaoan-hd5dc8-openai-guard` 請求也回覆不支援。此結果僅證明該資源／API 路徑未能使用指定模型。官方 LLM Speech 表的 MAI 區域不含 Japan East；Voice Live 在 Japan East 雖列出 MAI-Transcribe-2，推論處理範圍為 Global，Streaming 則未列可用。因此，僅把入口放在日本東仍可能跨區處理音訊。後續未獲明確採用決定前，不自行改走 Global 路徑。

依據：[Azure Speech 區域及處理範圍表](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions)、[MAI 呼叫定義](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe?pivots=programming-language-rest)。

## Qwen3-ASR 日本東價格

已成功下載 Azure Retail Prices API 的公開 USD、Consumption 價格；保存在 evidence 的 JSON 是本次查核依據。下表 VM 篩選 Linux（產品名稱不含 Windows）、一般隨用隨付，排除 Spot、Low Priority、預留方案。月費按 730 開機小時估算。

| 部署選項 | 資源配置 | 每開機小時 | 測試 10 小時 | 730 小時／月 |
|---|---|---:|---:|---:|
| Japan East NC4as_T4_v3 Linux VM | 1 張 T4 16GB，4 vCPU、28GiB RAM | US$0.710 | US$7.10 | US$518.30 |
| Japan East NC8as_T4_v3 Linux VM | 同為 1 張 T4 16GB，8 vCPU、56GiB RAM | US$1.015 | US$10.15 | US$740.95 |
| Japan East Container Apps T4，按 8 vCPU＋56GiB 配置估算 | GPU＋CPU＋記憶體 active rate 合計 | US$1.6776 | US$16.776 | US$1,224.648 |

VM 價格含配置內 CPU、RAM、GPU；另計 OS／資料磁碟、網路、公網或私有連線、映像儲存、監控等。Container Apps 表未扣免費 CPU／記憶體額度，也未另加請求／儲存等費用；實際配置較小時應重算，以上不是宣稱 8/56 為唯一允許配置。GPU 計費不能套用一般 CPU 副本的廉價 idle 假設。

Container Apps 日本東原始費率：T4 為 US$0.000106／GPU 秒，CPU active 為 US$0.000024／vCPU 秒，RAM active 為 US$0.000003／GiB 秒。

計算：`(0.000106 + 8×0.000024 + 56×0.000003) × 3600 = US$1.6776／開機小時`。只報 GPU 的 US$0.3816／小時會漏掉 CPU 與 RAM。

Container Apps 可縮至零，但起機、模型載入和縮容等待都應計入實際副本運行時間。例如每天總運行 1 小時、30 天，按上表配置為 US$50.328 純算力；它並非「每天一小時音訊」的固定報價。持續保溫時，NC4 VM 的公開算力價較低；低流量時 scale-to-zero 有機會節省閒置成本，但需量測冷啟動與運行時間。

來源：[Azure Retail Prices API 說明](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)、[Container Apps 計費頁](https://azure.microsoft.com/en-us/pricing/details/container-apps/)、[NCasT4_v3 配置](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/ncast4v3-series)、[Serverless GPU 區域與縮容](https://learn.microsoft.com/en-us/azure/container-apps/gpu-serverless-overview)。

可重查的 Retail API 篩選：

- `serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_NC4as_T4_v3' and priceType eq 'Consumption'`；再選 `armRegionName=japaneast`、`skuName=NC4as T4 v3`、Linux 產品。
- `serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_NC8as_T4_v3' and armRegionName eq 'japaneast' and priceType eq 'Consumption'`；排除 Windows／Spot／Low Priority。
- `serviceName eq 'Azure Container Apps' and armRegionName eq 'japaneast'`；選 Standard T4、vCPU Active、Memory Active meters。

## 建議起步方式與尚待驗證

推薦先把 NC4 T4 作為 Qwen3-ASR-1.7B 的短時測試候選：10 小時純算力約 US$7.10，先量測單請求顯存、長音訊、併發和句末延遲，再決定保溫 VM 或 Container Apps。0.6B 同步測試，部署同一張 GPU 時模型較小不會直接降低 VM 小時單價，優勢應以吞吐、延遲與是否可用更小運算資源衡量。

1.7B 的半精度參數粗估約 3.4GB，僅是參數量估算，尚需音訊編碼器執行暫存、KV cache、框架及併發空間。T4 16GB 是合理候選，尚未在 Azure 實測成功。官方 demo 使用 bfloat16／FlashAttention 3，不能直接照搬到 T4；T4 應驗證 FP16 與相容的 attention backend。Qwen 官方倉庫目前的串流實作依賴 vLLM，需另驗證所選 vLLM 版本與 T4 相容性。錄完轉寫可以先驗證 Transformers 路徑。

同一張 T4 可規劃分時載入 Qwen 與 Fun 測試，先避免同時常駐造成顯存競爭。現有 Japan East `xiaoan-pilot-env` 可作網路整合參考，但尚未新增 GPU profile。VM 的 GPU 配額查詢未取得有效家族列，SKU 可用性仍需確認，不能把公開價目視作訂閱已有容量。

每音訊小時成本取決於真實流量。若 NC4 全天開機，純算力 US$518.30／月：每月處理 100／1,000／10,000 音訊小時，分別攤為 US$5.183／0.5183／0.05183。這只是費用攤分，10,000 小時場景是否達得到尚未壓測。

下一步仍是日本東隔離 GPU 對測與多人方言語料。這次結果只完成三個選項的初步試用；未安裝推論套件、未部署 GPU、未更動產品程式或正式流量。
