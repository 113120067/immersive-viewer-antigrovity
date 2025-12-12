# 🟢 Google AI Imagen 設置指南

## 📋 功能概述

Google AI Imagen 是 Google 的先進文字轉圖片 AI 模型，提供高品質的圖片生成功能。

### ✨ Imagen 特色
- **高品質生成**：先進的擴散模型技術
- **多種比例**：支援正方形、橫向、縱向等多種比例
- **格式選擇**：JPEG 和 PNG 兩種輸出格式
- **種子控制**：可重現的生成結果
- **安全過濾**：內建內容安全機制

## 🔧 Google AI API 設置步驟

### 1. **取得 Google AI API Key**

1. 訪問 [Google AI Studio](https://aistudio.google.com/)
2. 登入你的 Google 帳戶
3. 點擊 "Get API Key" 或 "建立 API 金鑰"
4. 選擇或建立一個 Google Cloud 專案
5. 複製生成的 API Key

### 2. **啟用 Imagen API**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案
3. 搜尋並啟用 "Vertex AI API"
4. 確認 Imagen 服務已可用

### 3. **配置環境變數**

在 `.env` 文件中添加：

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## 🎨 Imagen vs DALL-E 比較

| 功能 | Google Imagen | Azure DALL-E 3 |
|------|---------------|-----------------|
| **最大提示詞長度** | 2000 字符 | 4000 字符 |
| **圖片尺寸** | 比例制 (1:1, 16:9 等) | 像素制 (1024x1024 等) |
| **輸出格式** | JPEG, PNG | URL 連結 |
| **品質選項** | 標準 | 標準, HD |
| **風格控制** | 自然 | 生動, 自然 |
| **種子支援** | ✅ 支援 | ❌ 不支援 |
| **圖片編輯** | ✅ 支援 | ❌ 不支援 |

## 🚀 使用方式

### 1. **基本圖片生成**

```javascript
// API 調用範例
const response = await fetch('/image-generator/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "A beautiful landscape with mountains and lake",
    provider: "google-imagen",
    aspectRatio: "16:9",
    outputFormat: "image/jpeg"
  })
});
```

### 2. **參數說明**

#### **aspectRatio（圖片比例）**
- `1:1` - 正方形
- `16:9` - 橫向寬螢幕
- `9:16` - 縱向手機螢幕
- `4:3` - 標準橫向
- `3:4` - 標準縱向

#### **outputFormat（輸出格式）**
- `image/jpeg` - JPEG 格式（較小檔案）
- `image/png` - PNG 格式（支援透明度）

#### **seed（隨機種子）**
- 數字值，用於重現相同的生成結果
- 相同的提示詞 + 種子 = 相同的圖片

### 3. **提示詞建議**

#### **有效的提示詞範例**
```
"A serene Japanese garden with cherry blossoms, koi pond, and traditional bridge, soft lighting, peaceful atmosphere"

"Modern minimalist living room with large windows, natural light, Scandinavian furniture, plants, clean lines"

"Fantasy dragon flying over medieval castle, dramatic clouds, golden hour lighting, epic fantasy art style"
```

#### **提示詞技巧**
- **具體描述**：包含顏色、材質、光線等細節
- **風格指定**：如 "digital art", "oil painting", "photography"
- **情緒氛圍**：如 "peaceful", "dramatic", "mysterious"
- **構圖說明**：如 "close-up", "wide angle", "bird's eye view"

## 🔒 安全性和限制

### **內容政策**
Google Imagen 有嚴格的內容政策，禁止生成：
- 暴力或危險內容
- 成人或性暗示內容
- 仇恨言論或歧視內容
- 侵犯版權的內容
- 真實人物的肖像

### **使用限制**
- 每分鐘請求次數限制
- 每日配額限制
- 提示詞長度限制（2000 字符）

### **隱私保護**
- 生成的圖片不會被 Google 儲存
- 提示詞可能用於改善服務
- 建議避免包含個人敏感資訊

## 💰 定價資訊

### **Google AI Imagen 定價**（參考官方定價）
- **標準生成**：約 $0.020 per image
- **高解析度**：約 $0.040 per image
- **圖片編輯**：約 $0.030 per edit

### **成本優化建議**
1. 使用適當的圖片比例避免浪費
2. 批次處理多個請求
3. 設定使用配額和監控
4. 優化提示詞減少重新生成

## 🛠️ 技術實作細節

### **API 整合**
```javascript
// Google AI SDK 使用範例
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = client.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: `Generate an image: ${prompt}` }]
  }]
});
```

### **錯誤處理**
```javascript
try {
  const result = await generateImage(params);
} catch (error) {
  if (error.message.includes('SAFETY')) {
    // 內容安全違規
  } else if (error.message.includes('QUOTA_EXCEEDED')) {
    // 配額超限
  } else if (error.message.includes('INVALID_ARGUMENT')) {
    // 參數錯誤
  }
}
```

## 🧪 測試和驗證

### **功能測試步驟**
1. 設定 `GOOGLE_AI_API_KEY` 環境變數
2. 重啟應用服務
3. 登入系統並訪問圖片生成器
4. 選擇 "Google Imagen" 提供商
5. 輸入測試提示詞：`"A red apple on a white table"`
6. 選擇 1:1 比例和 JPEG 格式
7. 點擊生成並驗證結果

### **常見問題排除**

#### **API Key 無效**
```
Invalid API key
```
**解決方案**：
- 檢查 API Key 是否正確複製
- 確認 API Key 有效且未過期
- 驗證 Google Cloud 專案設定

#### **配額超限**
```
Quota exceeded
```
**解決方案**：
- 檢查 Google Cloud Console 中的配額設定
- 等待配額重置或申請增加配額
- 實作請求頻率限制

#### **內容被拒絕**
```
Content safety violation
```
**解決方案**：
- 修改提示詞避免敏感內容
- 使用更中性和正面的描述
- 參考 Google AI 使用政策

## 📊 監控和分析

### **使用統計追蹤**
- 生成成功率
- 平均生成時間
- 錯誤類型分布
- 使用者偏好分析

### **效能優化**
- 快取常用生成結果
- 批次處理請求
- 智慧重試機制
- 負載平衡

## 🔄 多提供商整合

### **自動切換機制**
系統支援在多個 AI 提供商之間自動切換：

1. **優先順序**：Azure OpenAI → Google Imagen
2. **故障轉移**：主要服務失敗時自動切換
3. **負載平衡**：根據使用情況分散請求
4. **成本優化**：選擇最經濟的提供商

### **使用者選擇**
使用者可以：
- 選擇特定的 AI 提供商
- 使用自動模式讓系統選擇
- 比較不同提供商的結果
- 根據需求選擇最適合的選項

---

**🎉 現在你可以使用 Google AI Imagen 生成高品質圖片了！**

記得先取得 Google AI API Key 並更新環境變數配置。