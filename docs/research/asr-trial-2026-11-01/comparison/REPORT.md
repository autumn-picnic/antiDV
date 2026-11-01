<!-- markdownlint-disable MD013 -->
# Azure Speech 與 Qwen 方言／不清晰音訊對比

更新：本頁為接入前的 Standard／Qwen 比較快照。後續 [自動識別補測](../automatic/REPORT.md) 及 [目前接入設計](../../../SPEECH_RECORDING_DESIGN.md) 已新增，請一併閱讀。
日期：2026-11-01。已完成 19 段音訊、總長 86.19 秒的實際轉寫。Azure Speech 日本東全部請求取得結果；Qwen3-ASR-1.7B 官方 demo 完成 2 段，其餘 17 段回傳服務錯誤。這批資料目前支持評估 Azure 的具體表現，兩者的全面優劣仍待補齊 Qwen。

附帶的 `report.html` 是可離線開啟的單檔報告，內嵌全部 19 段測試錄音，可逐段播放，並列出參考原文、兩個引擎的實際輸出、狀態與字錯率。`audio/` 保留實體音訊，`raw/` 保留每次回應，`manifest.json` 記錄來源、處理條件、時長與 SHA-256。

## 目前可以採取的判斷

Azure Speech 可以作為小安首版語音輸入候選：本次普通話及部分方言辨識良好，低音量與部分失真也有韌性；方言錯詞和姓名誤識仍需要「先顯示草稿、確認後發送」。Qwen 尚無足夠配對結果支持選它取代 Azure。供應商 demo 的服務錯誤與模型的聽辨錯誤分別記錄。

| 組別 | 段數 | Azure 字錯數／參考字數 | CER |
|---|---:|---:|---:|
| 成都西南官話 | 3 | 2／48 | 4.17% |
| 鄭州中原官話 | 3 | 7／43 | 16.28% |
| 青島膠遼官話 | 3 | 4／48 | 8.33% |
| 鄭州、青島說話者的普通話 | 2 | 0／32 | 0% |
| 人工退化：低音量、窄頻、加噪 | 6 | 2／96 | 2.08% |
| 粵語 | 1 | 原始來源未提供本次可核對逐字稿 | 不評分 |
| 數位靜音 | 1 | Azure 輸出空字串 | 不評 CER |

自然錄音中有參考稿的 11 段合計 CER 為 13／171＝7.60%；另 6 段退化音訊為重複原句的壓力測試，分開統計。CER 為移除標點、空白並作 Unicode NFKC 後的字元編輯距離除以參考字數；已評分輸出皆為簡體字，粵語未混入總分。Qwen 成功的成都前兩段與 Azure 都是 0 字錯；其餘配對缺失，沒有全組 Qwen CER。

具體錯誤包括「酒店」辨為「九點」、「原唱者」辨為「院長者」、退化錄音中的「陳增新」辨為「陳增興／陳更新」。其中「他／她」同音，也會計入文本 CER，應與語音辨音錯誤分開理解。另測成都的 `zh-CN-sichuan` locale，這三段輸出與 `zh-CN` 相同，未觀察到改善。

## 錄音與測試方法

真人方言與普通話錄音取自 [KeSpeech 作者展示頁](https://wen2cheng.github.io/)，僅使用 `gt/` 原始錄音，排除頁面中的變聲轉換錄音。每個地區 3 段方言；另有鄭州和青島說話者的普通話各 1 段。這部分主要來自 3 位說話者，是小樣本案例比較，尚未覆蓋城市內部口音差異。粵語使用 [FunAudioLLM 官方公開範例](https://huggingface.co/FunAudioLLM/SenseVoiceSmall/resolve/main/example/yue.mp3)，未用兩個模型的共識替代人工標準答案。

同一段音訊轉為 16kHz、mono、PCM16 後交給兩個引擎。Azure 使用日本東 Speech Standard short-audio REST、`format=detailed`，普通話及官話方言用 `zh-CN`，粵語用 `zh-HK`；Qwen 使用官方 demo 的 `Auto`、不開時間戳。兩者均未提供參考文字、熱詞或上下文。Azure 的已知語種選擇與 Qwen 自動識別設定已記錄，尚未測 Azure 自動語種識別。

人工退化各取一段成都方言及一段普通話：低音量為原振幅的 0.0316228（約 -30dB）；窄頻為 400Hz 高通、1800Hz 低通；加噪為固定 seed=42 的白噪音。依實際樣本能量量得加噪 SNR，成都約 4.60dB、普通話約 0.99dB。低音量只是數位降幅，沒有重現遠場麥克風底噪；窄頻與白噪也只是受控失真，與真人吞字、醉酒、哭泣或構音困難不同。後面幾類自然含糊語音本次仍缺少適當標註錄音，尚未驗證。

short-audio API 僅返回 final，適用於這批短句的品質比較；它不是串流 SDK 的 partial 延遲測試。Qwen demo 的 ZeroGPU 環境與 Azure 託管硬體不同，網路／排隊耗時只保留於 raw，不作推論速度排名。[Azure 短音訊 API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short)。

Qwen 前兩段正常，後續每段返回 `event: error / data: null`，服務未提供具體原因，因此未確認是否配額或後端故障。使用者已選擇先交付現有結果，不安裝本機推論套件。失敗列沒有被填成 100% CER 或從分母中悄悄刪除。

## 日本東 Azure Speech 價格

已下載官方 Retail Prices API 日本東 USD 隨用隨付資料，存為 `azure-speech-japaneast-prices.json`。產品為 `Azure Speech`，服務分類為 `Foundry Tools`。下列均是牌價，未含稅、匯率、合約折扣與小安回答模型費。

| 項目 | 單價 | 1,000 音訊小時 |
|---|---:|---:|
| Standard 即時 STT（本次測試路徑） | US$1.00／音訊小時 | US$1,000 |
| Fast Transcription | US$0.36／音訊小時 | US$360 |
| Batch STT | US$0.18／音訊小時 | US$180 |
| Custom 即時 STT | US$1.20／音訊小時 | US$1,200 |
| Custom Batch STT | US$0.225／音訊小時 | US$225 |
| Custom Fast Transcription | US$0.45／音訊小時 | US$450 |
| Enhanced Feature Audio | US$0.30／音訊小時／適用功能 | 另加 US$300／功能 |
| Custom Speech 訓練 | US$10／計算小時 | 按訓練用量 |
| Custom Speech 模型託管 | US$0.05375／端點小時 | 全天 730 小時約 US$39.24／月 |

Batch 價格需要適用的批次 API，並非即時辨識折扣。本次沒有測試 Fast、Batch 或 Custom 的辨識結果。資料中另有 `Fast Transcription Promo Speech To Text` US$0.10／小時；這是獨立促銷 meter，未拿它代替 Standard US$1。採購時須核對所選 API／模型實際對應的 meter。

免費 F0 另有每月 5 小時即時辨識額度；本次資源為 S0，未假設可直接扣抵 F0 額度。Standard 約 US$0.01667／音訊分鐘，10 秒音訊約 US$0.00278。19 段主測加 3 段四川 locale 補測，送到專用資源的音訊約 97.75 秒；按秒向上取整保守估算 112 秒，約 US$0.0311。這是牌價計算，未從帳單確認實扣；另有現有資源的先導請求不含於上述數量。

專用測試資源：`xiaoan-pilot-rg / xiaoan-speech-trial-jpe-20261101`，位於 `japaneast`，類型 SpeechServices、SKU S0。未變更小安正式輸入流程。先導測試中現有 AIServices 資源以區域 STT URL 回覆 401，改官方自訂網域路徑後成功；主要對測使用專用 Speech 資源，避免混用既有 guard 資源的帳務與設定。該按量資源目前保留，未部署 Custom 模型或固定 GPU。

來源：[官方價格頁](https://azure.microsoft.com/en-us/pricing/details/speech/)、[Retail API 定義](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)。本次查詢篩選 `armRegionName eq 'japaneast' and contains(productName, 'Speech')`，保存回傳完整 meter，從中取一般 S1／Fast meter，排除承諾量及 disconnected 合約價格。

## Qwen 是否可以沒有請求就關閉

**可以，建議的按需方式是 Japan East Container Apps serverless T4，設定 minReplicas=0 並配置 HTTP 或佇列觸發器。**請求到達時啟動副本、載入 Qwen；閒置後縮至零，停止該副本的 CPU／RAM／GPU 用量費。映像倉庫、儲存等仍可能計費，也不是每個請求結束就立刻關閉。官方預設縮容行為包含約 300 秒的冷卻／穩定視窗；具體依所用觸發器及配置確認。CPU／記憶體負載規則本身無法從零喚起服務。

前面每月 US$518.30 的 NC4 T4 是一般 Linux VM 全天開機費。這種 VM 可以停止並解除配置，但需另設常駐輕量閘道、啟動流程與佇列；僅把作業系統關機或停止 Qwen 進程，未必釋放 VM 計費配置。自動按請求啟停是平台部署設計，不是模型權重本身具備的能力。

日本東 Container Apps T4 的參考全配置 8 vCPU／56GiB，active 合計 US$1.6776／運行小時；縮至零後此副本用量為零。普通 T4 VM US$0.710／開機小時。以實際「副本存活秒數」計算按需成本，不能直接乘音訊時長。實際 app 配置較小時需重算 CPU、RAM 費；此處保留先前可核對的配置預算。

例如只為說明計費：一次冷啟動 60 秒＋處理 10 秒＋縮容等待 300 秒，合計 370 秒；按上述全 active 費率約 US$0.1724／獨立啟動週期。這些時間是假設值，未實測；若請求集中在同一保溫週期，會共用啟動與等待成本。Azure Standard 同樣 10 秒音訊約 US$0.00278，低流量且零散使用時很有成本優勢。

## 冷啟動會多久

**目前沒有這個 Qwen 日本東配置的實測時間。**官方一般優化指引描述為數十秒；GPU 排程、映像拉取、Python 初始化、模型權重讀取、GPU 載入及第一次推論都會增加首請求時間。工程預算可先預留約 30–120 秒，未快取映像、首次下載權重或區域容量不足時可能數分鐘以上；這個範圍是規劃假設，並非 Qwen／Azure 的 SLA。

若要把時間縮短，應把映像與模型權重預先放在日本東，避免每次從 Hugging Face 下載；精簡推論映像，必要時使用 ACR Premium artifact streaming；延長 startup probe；用 job ID／輪詢處理首次長等待。排程預熱或保留 1 個副本可改善延遲，但增加閒置費用。對小安即時求助輸入，建議 Azure Speech 即時接入，Qwen 在方言優勢得到完整驗證後才考慮作補充，避免先讓使用者承受未量測冷啟動。

實測方法：部署日本東隔離測試端點，確認副本數已為零，至少做 10 次獨立冷啟動；記錄 request→排程→容器→模型 ready→首結果時間，並量測 warm request。分別測映像快取、未快取及重啟後權重已存儲的情境，報 p50／p95，才可給小安承諾時間。本次未建立 GPU，也未把 demo 回應時間當成 Azure 冷啟動。

依據：[GPU serverless 概覽及 Japan East T4 支援](https://learn.microsoft.com/en-us/azure/container-apps/gpu-serverless-overview)、[冷啟動組成與優化](https://learn.microsoft.com/en-us/azure/container-apps/cold-start)、[官方 AI 成本優化指引](https://learn.microsoft.com/en-us/startups/build/ai/ai-cost-optimization)、[縮容與預設等待規則](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)。

## 下一步

若先做小安首版，採 Azure Standard、語音轉寫後確認發送，預留重錄與修改。下一輪補測需優先加入多人普通話口音、吳語／閩南語、帶小安情境的否定句與人稱，以及真實低聲、哭泣、吞字錄音，並在可控 Qwen runtime 完成配對。現有結果沒有涵蓋這些能力，也未涉及供應商 Custom Speech 適配訓練。
