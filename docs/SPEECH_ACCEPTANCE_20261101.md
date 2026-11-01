<!-- markdownlint-disable MD013 -->
# 語音錄音整合驗收

2026-11-01。範圍為自動識別、原始錄音保存、feedback 管理員播放與麥克風邀請。

- 102 項測試通過：包含共用資料庫參數化寫入、原音 bytes／SHA256、狀態、列表審計、訪客／普通用戶拒絕、Range／206／416、無效 ID、取消遲到結果、草稿保留及聊天回歸。
- TypeScript 與變更檔案 ESLint 通過；完整 production build 交由 PR 的 Speech acceptance 工作流執行。
- 資料表遷移已透過日本東後端容器執行；既有 feedback 登入在正式前端容器完成合成資料寫讀、狀態更新、播放審計及交易回滾，回讀合成 UUID 的筆數為 0。
- 瀏覽器 fixture：點麥克風先開邀請；取消不收音；模擬拒絕後顯示設定與重試；重試可錄音，轉寫只進草稿，修改後點發送才提交。
- 瀏覽器後台 fixture：列表與載入錄音可用；公開 WAV 播放至 4.538625 秒，readyState 4，無媒體錯誤。
- fixture 使用公開音訊與合成列表；播放路由暫以公開檔案代替，驗收後已還原 requireActor(true) 保護路由。認證與音訊 Range 由自動測試另行驗證，未聲稱已使用指定管理員正式登入播放。
- 本機快取佔滿磁碟，雖已獲清理授權，命令保護仍拒絕刪除；未繞過，改用 GitHub Actions 完整建置。
- 原比較 report.html 的 19 段內嵌音訊及 manifest 實體檔 SHA256 全數核對成功；研究目錄掃描未含本地 key／secret 值。

日本東 Fast Transcription 真實公開錄音補測見
[自動識別報告](research/asr-trial-2026-11-01/automatic/REPORT.md)。
正式發布之後另核對 PR 合併、Actions、映像提交、ready revision、100% 流量及 API 實測。
