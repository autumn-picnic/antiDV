<!-- markdownlint-disable MD013 -->
# 日本東 Azure Speech 自動識別補測

2026-11-01。原 19 段 Standard／Qwen 比較保留在 [離線報告](../comparison/report.html)；本輪驗證新增自動模式。

Fast Transcription，API `2025-10-15`，同一日本東 S0 資源；沒有指定 `locales`、參考稿或熱詞。

| 公開錄音 | HTTP | 耗時 | 輸出摘要 |
| --- | --- | --- | --- |
| 鄭州普通話 | 200 | 0.77 秒 | 陈增新说，他打电话让对方拿回去。 |
| 成都方言 | 200 | 0.65 秒 | 关系到整个民族的素质和道德情操的提高。 |
| 粵語 | 200 | 0.66 秒 | 这几个字都表达不到我想讲的意思。 |

三段均回傳 `zh-CN` 標籤。粵語輸出偏書面普通話，不保留全部粵語用字；原 Standard zh-HK 路徑曾輸出「呢幾個字都表達唔到我想講嘅意思」。因此，前端無須選語言，但這三段結果只支持初步可用性，沒有證明所有方言均可準確區分或逐字保留。

另測隱藏候選列表 zh-CN／zh-HK／zh-CN-sichuan，三段也都回傳 zh-CN，未改善粵語字形。正式採用不指定 locales 的官方自動模式，避免把候選列表當成可靠的漢語方言分類器。

[完整自動回應](automatic-no-locale.json) · [候選列表回應](candidate-locales.json)。原始錄音仍在 comparison/audio，來源與 SHA-256 見 comparison/manifest.json。

來源：[Fast Transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create)、[語言識別限制](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification)。
