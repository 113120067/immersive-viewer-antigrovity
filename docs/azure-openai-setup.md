# 🎨 Azure OpenAI DALL-E 圖片生成器設置指南

## 📋 功能概述

這個模組整合了 Azure OpenAI 的 DALL-E 模型，提供文字轉圖片的 AI 生成功能。

### ✨ 主要功能
- **文字轉圖片**：使用自然語言描述生成高品質圖片
- **多種尺寸**：支援正方形、橫向、縱向三種比例
- **品質選擇**：標準和 HD 兩種品質選項
- **風格控制**：生動創意或自然寫實兩種風格
- **登入保護**：只有認證用戶才能使用
- **使用統計**：追蹤個人使用情況

## 🔧 Azure OpenAI 設置步驟

### 1. **建立 Azure OpenAI 資源**

1. 登入 [Azure Portal](https://portal.azure.com/)
2. 搜尋並選擇 "Azure OpenAI"
3. 點擊 "建立" 建立新資源
4. 填寫基本資訊：
   - **訂用帳戶**：選擇你的 Azure 訂用帳戶
   - **資源群組**：建立新的或選擇現有的
   - **區域**：選擇支援 DALL-E 的區域（如 East US）
   - **名稱**：輸入唯一的資源名稱
   - **定價層**：選擇適合的定價層

### 2. **部署 DALL-E 模型**

1. 資源建立完成後，進入 Azure OpenAI Studio
2. 點擊 "部署" → "建立新部署"
3. 選擇模型：
   - **模型**：`dall-e-3`
   - **版本**：選擇最新版本
   - **部署名稱**：例如 `dall-e-3`（記住這個名稱）
4. 點擊 "建立" 完成部署

### 3. **取得連接資訊**

在 Azure Portal 的 Azure OpenAI 資源中：
1. 點擊 "金鑰和端點"
2. 複製以下資訊：
   - **端點**：類似 `https://your-resource-name.openai.azure.com/`
   - **金鑰 1** 或 **金鑰 2**：選擇其中一個

## ⚙️ 環境變數配置

在 `.env` 文件中添加以下配置：

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3
```

### 配置說明
- `AZURE_OPENAI_ENDPOINT`：你的 Azure OpenAI 資源端點
- `AZURE_OPENAI_API_KEY`：Azure OpenAI 的 API 金鑰
- `AZURE_OPENAI_DALLE_DEPLOYMENT`：DALL-E 模型的部署名稱

## 🚀 使用方式

### 1. **訪問圖片生成器**
- 登入後，導航欄會顯示 "🎨 AI Images" 連結
- 點擊進入圖片生成器頁面

### 2. **生成圖片**
1. **輸入描述**：在文字框中描述你想要的圖片
2. **選擇參數**：
   - **尺寸**：正方形 (1024×1024)、橫向 (1792×1024)、縱向 (1024×1792)
   - **品質**：標準或 HD（HD 品質成本較高）
   - **風格**：生動創意或自然寫實
3. **點擊生成**：等待 10-30 秒完成生成
4. **下載圖片**：生成完成後可以下載圖片

### 3. **提示詞建議**
- **具體描述**：越詳細越好，包含風格、顏色、構圖等
- **範例**：`"A beautiful sunset over mountains with a lake in the foreground, digital art style, vibrant colors"`
- **避免**：暴力、色情、仇恨等不當內容

## 📊 API 端點

### **生成圖片**
```http
POST /image-generator/generate
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "prompt": "A beautiful landscape",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid"
}
```

### **獲取使用統計**
```http
GET /image-generator/usage
Authorization: Bearer <firebase-token>
```

### **獲取配置資訊**
```http
GET /image-generator/config
Authorization: Bearer <firebase-token>
```

## 🔒 安全性設計

### **認證保護**
- 所有 API 端點都需要 Firebase 認證
- 未登入用戶無法訪問圖片生成功能

### **內容過濾**
- 基本的禁用詞彙檢查
- Azure OpenAI 內建內容政策保護
- 提示詞長度限制（4000 字符）

### **使用限制**
- 可以實作每日/每月使用限制
- 追蹤個人使用統計
- 成本控制機制

## 💰 成本考量

### **DALL-E 3 定價**（參考 Azure 官方定價）
- **標準品質 (1024×1024)**：約 $0.04 per image
- **HD 品質 (1024×1024)**：約 $0.08 per image
- **大尺寸圖片**：價格可能更高

### **成本優化建議**
1. 設定每日/每月使用限制
2. 預設使用標準品質
3. 監控使用統計和費用
4. 考慮實作使用配額系統

## 🛠️ 技術架構

### **後端組件**
- `src/services/azure-openai-service.js`：Azure OpenAI 服務封裝
- `routes/image-generator.js`：API 路由處理
- `src/middleware/auth-middleware.js`：認證中介軟體

### **前端組件**
- `views/image-generator.pug`：圖片生成器頁面
- `public/js/image-generator.js`：前端邏輯
- Firebase 認證整合

### **依賴套件**
- `@azure/openai`：Azure OpenAI SDK
- `firebase-admin`：後端認證驗證
- Firebase Web SDK：前端認證

## 🧪 測試步驟

### 1. **配置測試**
```bash
# 檢查服務啟動日誌
npm start
# 應該看到：✅ Azure OpenAI service initialized successfully
```

### 2. **功能測試**
1. 登入系統
2. 訪問 `/image-generator`
3. 輸入簡單提示詞：`"A red apple on a white table"`
4. 選擇標準品質和正方形尺寸
5. 點擊生成並等待結果

### 3. **錯誤處理測試**
- 測試未登入訪問（應該重定向到登入頁）
- 測試空白提示詞（應該顯示錯誤）
- 測試過長提示詞（應該顯示字符限制錯誤）

## 🚨 故障排除

### **常見問題**

#### 1. **服務初始化失敗**
```
❌ Failed to initialize Azure OpenAI service
```
**解決方案**：
- 檢查 `.env` 文件中的 `AZURE_OPENAI_ENDPOINT` 和 `AZURE_OPENAI_API_KEY`
- 確認 Azure OpenAI 資源已正確建立
- 檢查 API 金鑰是否有效

#### 2. **模型部署錯誤**
```
Model deployment not found
```
**解決方案**：
- 確認 DALL-E 模型已在 Azure OpenAI Studio 中部署
- 檢查 `AZURE_OPENAI_DALLE_DEPLOYMENT` 名稱是否正確

#### 3. **內容政策違規**
```
Content policy violation
```
**解決方案**：
- 修改提示詞，避免暴力、色情等不當內容
- 使用更中性和正面的描述

#### 4. **配額超限**
```
Rate limit exceeded / Insufficient quota
```
**解決方案**：
- 檢查 Azure OpenAI 資源的配額設定
- 等待配額重置或升級訂用帳戶

## 📈 監控和維護

### **日誌監控**
- 監控生成成功率
- 追蹤錯誤類型和頻率
- 記錄使用統計

### **效能優化**
- 實作圖片快取機制
- 優化提示詞處理
- 考慮批次處理需求

### **安全更新**
- 定期更新 Azure OpenAI SDK
- 加強內容過濾機制
- 監控異常使用模式

---

**🎉 現在你可以開始使用 AI 圖片生成功能了！**

記得先在 Azure 中設置好 OpenAI 資源和 DALL-E 部署，然後更新 `.env` 文件中的配置。