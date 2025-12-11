# Testing Guide

## Classroom System Testing

本文件說明如何測試雙模式儲存架構（記憶體 vs Firestore）的課堂功能。

## 前置準備

1. 安裝依賴套件：
   ```bash
   npm install
   ```

2. 設定環境變數（參考 `.env.example`）：
   - Firebase Web Config（必要）
   - Firebase Admin SDK（選擇性，用於 Firestore 模式）

3. 啟動伺服器：
   ```bash
   npm start
   ```

## 測試場景

### 一、未登入模式測試（記憶體儲存）

#### 1. 建立課堂
- 前往 `/classroom/create`
- **預期**：顯示黃色警告訊息「未登入 - 課堂將在 24 小時後刪除」
- 上傳檔案並填寫課堂名稱
- 提交表單
- **預期**：成功建立課堂，顯示 4 位代碼
- **預期**：顯示黃色提示「課堂暫存於記憶體，將在 24 小時後刪除」

#### 2. 加入課堂
- 前往 `/classroom/join`
- 輸入課堂代碼和學生姓名
- **預期**：成功加入課堂，跳轉至學習頁面

#### 3. 學習與排行榜
- 在學習頁面開始學習
- 查看排行榜
- **預期**：能正常顯示學習時間和排名

#### 4. 驗證資料遺失
- 重啟伺服器：
  ```bash
  # Ctrl+C 停止伺服器
  npm start
  ```
- 嘗試訪問之前建立的課堂
- **預期**：課堂不存在（404 錯誤）

---

### 二、登入模式測試（Firestore 儲存）

#### 前置條件
- 確保 `FIREBASE_SERVICE_ACCOUNT` 環境變數已設定
- 重啟伺服器以載入環境變數

#### 1. 登入
- 前往 `/login.html`
- 使用 Google 或 Email 登入
- **預期**：登入成功，導覽列顯示「My Classrooms」連結

#### 2. 建立課堂
- 前往 `/classroom/create`
- **預期**：顯示綠色訊息「已登入 (email) - 課堂資料將永久保存」
- 上傳檔案並建立課堂
- **預期**：成功建立，顯示綠色提示「課堂已永久保存到雲端」

#### 3. 查看我的課堂
- 點擊導覽列「My Classrooms」
- **預期**：看到「我建立的課堂」區塊
- **預期**：剛建立的課堂出現在列表中，顯示：
  - 課堂名稱
  - 代碼
  - 單字數
  - 學生數
  - 建立日期

#### 4. 加入其他課堂
- 開啟無痕視窗或另一個瀏覽器
- 登入不同帳號（或同一帳號）
- 前往 `/classroom/join`
- 輸入課堂代碼和學生姓名
- **預期**：成功加入課堂

#### 5. 查看學習進度
- 回到 `/classroom/my`
- **預期**：看到「我參加的課堂」區塊
- 點擊「學習進度」按鈕
- **預期**：顯示詳細進度頁面，包含：
  - 總學習時間
  - 班級排名
  - 學習天數
  - 單字掌握度
  - 學習時間趨勢圖表
  - 單字統計（正確率）
  - 學習記錄列表

#### 6. 驗證資料持久性
- 重啟伺服器
- 登入相同帳號
- 前往 `/classroom/my`
- **預期**：所有課堂資料依然存在

---

### 三、混合模式測試

#### 1. 未登入建立課堂 A（記憶體）
- 登出（如果已登入）
- 建立課堂 A
- **預期**：顯示「暫存於記憶體」提示

#### 2. 登入建立課堂 B（Firestore）
- 登入
- 建立課堂 B
- **預期**：顯示「永久保存到雲端」提示

#### 3. 未登入加入課堂 B
- 登出
- 使用課堂 B 的代碼加入
- **預期**：可以成功加入（因為課堂 B 是公開的）

#### 4. 查看我的課堂
- 登入
- 前往 `/classroom/my`
- **預期**：只看到課堂 B（課堂 A 不在 Firestore 中）

---

## 測試檢查清單

### 功能測試
- [ ] 未登入建立課堂（記憶體模式）
- [ ] 登入建立課堂（Firestore 模式）
- [ ] 加入課堂（兩種模式）
- [ ] 開始/結束學習會話
- [ ] 查看排行榜
- [ ] 查看學生狀態
- [ ] 單字交換功能
- [ ] 記錄練習結果
- [ ] 查看我的課堂（老師）
- [ ] 查看我的課堂（學生）
- [ ] 查看學習進度

### UI/UX 測試
- [ ] 登入狀態提示正確顯示
- [ ] 導覽列「My Classrooms」連結顯示/隱藏
- [ ] 課堂卡片資訊完整
- [ ] 圖表正確渲染
- [ ] 空狀態訊息顯示
- [ ] 錯誤訊息友善

### 資料完整性測試
- [ ] 記憶體課堂在重啟後消失
- [ ] Firestore 課堂在重啟後保留
- [ ] 學習時間正確累計
- [ ] 排名正確計算
- [ ] 單字統計準確

### 安全性測試
- [ ] 未登入無法訪問 `/api/my-classrooms`
- [ ] 未登入無法訪問 `/api/my-participations`
- [ ] 未登入無法訪問 `/api/progress/:id`
- [ ] 私人課堂無法被非擁有者訪問（若實作）

---

## 已知限制

1. **記憶體模式**：
   - 伺服器重啟後資料遺失
   - 不支援多伺服器部署
   - 24 小時自動刪除

2. **Firestore 模式**：
   - 需要設定 Firebase Admin SDK
   - 依賴 Firebase 服務可用性
   - 需要網路連線

3. **混合模式**：
   - 未登入建立的課堂無法在「我的課堂」中查看
   - 學習進度功能僅支援 Firestore 課堂

---

## 疑難排解

### Firebase Admin SDK 初始化失敗
- 檢查 `FIREBASE_SERVICE_ACCOUNT` 環境變數是否正確設定
- 確認 JSON 格式正確（如果使用 JSON 字串）
- 確認檔案路徑存在（如果使用檔案路徑）
- 查看伺服器 console 輸出的錯誤訊息

### 課堂無法顯示在「我的課堂」
- 確認是否以登入狀態建立課堂
- 確認 Firebase Admin SDK 已正確初始化
- 檢查瀏覽器 console 是否有錯誤訊息

### 學習進度圖表無法顯示
- 確認 Chart.js CDN 正確載入
- 檢查是否有學習記錄資料
- 查看瀏覽器 console 錯誤訊息

---

## 測試報告範本

測試日期：__________  
測試人員：__________  
環境設定：
- [ ] Firebase Web Config
- [ ] Firebase Admin SDK

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| 未登入建立課堂 | ☐ 通過 ☐ 失敗 | |
| 登入建立課堂 | ☐ 通過 ☐ 失敗 | |
| 查看我的課堂 | ☐ 通過 ☐ 失敗 | |
| 學習進度頁面 | ☐ 通過 ☐ 失敗 | |
| 資料持久性 | ☐ 通過 ☐ 失敗 | |

---

## Azure Computer Vision Testing

### 前置準備

1. 設定 Azure Computer Vision 環境變數：
   ```bash
   AZURE_VISION_KEY=your_azure_vision_key
   AZURE_VISION_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
   ```

2. 確保 Firebase Admin SDK 已初始化（用於圖片儲存）

3. 準備測試圖片：
   - 包含文字的圖片（用於 OCR 測試）
   - 包含物件的圖片（用於物件偵測測試）
   - 各種格式：JPEG, PNG, GIF, BMP

### 網頁介面測試

#### 1. 訪問 Vision Analyzer 頁面
```
http://localhost:3000/vision-analyzer
```

**預期**：
- 頁面正確載入
- 顯示上傳區域
- 顯示「Complete Analysis」和「OCR Only」按鈕

#### 2. 上傳圖片並執行完整分析
- 點擊上傳區域選擇圖片
- **預期**：顯示圖片預覽
- 點擊「Complete Analysis」
- **預期**：
  - 顯示載入動畫
  - 成功後顯示以下結果：
    - OCR 文字辨識結果
    - 智慧標籤（Smart Tags）
    - AI 描述（Description）
    - 偵測到的物件（Objects）
    - 色彩分析（Color Analysis）

#### 3. 執行 OCR 專用分析
- 上傳包含文字的圖片
- 點擊「OCR Only」
- **預期**：
  - 只顯示 OCR 文字辨識結果
  - 不顯示標籤、描述等其他分析

#### 4. 查看最近分析記錄
- **預期**：在「Recent Analyses」區塊看到剛才的分析記錄
- 顯示檔案名稱、日期、部分 OCR 文字和標籤

### API 端點測試

#### 1. 上傳並分析圖片
```bash
curl -X POST http://localhost:3000/vision/analyze \
  -F "image=@test-image.jpg" \
  -F "userId=user123"
```

**預期回應**：
```json
{
  "success": true,
  "analysisId": "abc123...",
  "imageUrl": "https://storage.googleapis.com/...",
  "result": {
    "ocr": {
      "text": "extracted text...",
      "lines": [...],
      "language": "zh-Hant"
    },
    "analysis": {
      "tags": [...],
      "description": {...},
      "objects": [...],
      "colors": {...}
    }
  }
}
```

#### 2. 僅執行 OCR
```bash
curl -X POST http://localhost:3000/vision/ocr-only \
  -F "image=@document.jpg"
```

**預期回應**：
```json
{
  "success": true,
  "imageUrl": "https://storage.googleapis.com/...",
  "result": {
    "text": "extracted text...",
    "lines": [...],
    "language": "zh-Hant"
  }
}
```

#### 3. 取得指定分析結果
```bash
curl http://localhost:3000/vision/analysis/{analysisId}
```

**預期回應**：
```json
{
  "success": true,
  "analysisId": "abc123...",
  "data": {
    "userId": "user123",
    "imageUrl": "...",
    "ocrText": "...",
    "tags": [...],
    ...
  }
}
```

#### 4. 搜尋分析結果（文字搜尋）
```bash
curl "http://localhost:3000/vision/search?userId=user123&query=書本&type=text"
```

**預期回應**：
```json
{
  "success": true,
  "count": 2,
  "results": [...]
}
```

#### 5. 搜尋分析結果（標籤搜尋）
```bash
curl "http://localhost:3000/vision/search?userId=user123&query=book&type=tags"
```

**預期回應**：
```json
{
  "success": true,
  "count": 3,
  "results": [...]
}
```

### 錯誤處理測試

#### 1. 上傳非圖片檔案
- 嘗試上傳 .txt 或 .pdf 檔案
- **預期**：顯示錯誤訊息「Only image files are allowed」

#### 2. 上傳超過 5MB 的圖片
- 上傳大於 5MB 的圖片
- **預期**：顯示錯誤訊息「File size exceeds limit (5MB)」

#### 3. 未設定 Azure Vision 憑證
- 移除 `AZURE_VISION_KEY` 環境變數
- 重啟伺服器
- 嘗試分析圖片
- **預期**：顯示錯誤訊息「Azure Computer Vision client not initialized」

#### 4. 無效的圖片 URL
- 使用 API 傳送無效的圖片 URL
- **預期**：回傳錯誤訊息

### Firestore 安全規則測試

#### 1. 未認證使用者嘗試建立分析
- 在未設定 `userId` 的情況下呼叫 API
- **預期**：回傳 400 錯誤「userId is required」

#### 2. 嘗試讀取他人的分析結果
- 使用不同的 `userId` 查詢分析記錄
- **預期**：無法取得他人的分析結果

### 效能測試

#### 1. 並行執行 OCR 和圖片分析
- 上傳圖片並執行完整分析
- 監控後端 console 輸出
- **預期**：看到「Starting OCR」和「Starting image analysis」幾乎同時出現

#### 2. 大圖片處理
- 上傳接近 5MB 的圖片
- **預期**：
  - 上傳成功
  - 分析在合理時間內完成（< 30 秒）

### 測試檢查清單

#### 功能測試
- [ ] 圖片上傳與預覽
- [ ] 完整分析（OCR + 圖片分析）
- [ ] OCR 專用分析
- [ ] 中文文字辨識
- [ ] 英文文字辨識
- [ ] 標籤生成
- [ ] 圖片描述生成
- [ ] 物件偵測
- [ ] 色彩分析
- [ ] 最近分析記錄顯示

#### API 測試
- [ ] POST /vision/analyze
- [ ] POST /vision/ocr-only
- [ ] GET /vision/analysis/:id
- [ ] GET /vision/search (文字搜尋)
- [ ] GET /vision/search (標籤搜尋)

#### 錯誤處理
- [ ] 檔案類型驗證
- [ ] 檔案大小限制
- [ ] Azure 憑證驗證
- [ ] 使用者身份驗證

#### 安全性
- [ ] Firestore 安全規則生效
- [ ] 無法讀取他人資料
- [ ] 圖片公開存取控制

#### UI/UX
- [ ] 響應式設計
- [ ] 載入狀態顯示
- [ ] 錯誤訊息友善
- [ ] 結果清晰易讀

---

## 測試報告範本 - Vision API

測試日期：__________  
測試人員：__________  
環境設定：
- [ ] Azure Computer Vision Key
- [ ] Azure Computer Vision Endpoint
- [ ] Firebase Admin SDK

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| 完整分析 | ☐ 通過 ☐ 失敗 | |
| OCR 專用 | ☐ 通過 ☐ 失敗 | |
| 中文辨識 | ☐ 通過 ☐ 失敗 | |
| 標籤生成 | ☐ 通過 ☐ 失敗 | |
| 物件偵測 | ☐ 通過 ☐ 失敗 | |
| API 端點 | ☐ 通過 ☐ 失敗 | |
| 資料持久性 | ☐ 通過 ☐ 失敗 | |
