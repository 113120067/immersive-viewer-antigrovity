# 🖼️ 兒童圖片生成器 - 檢舉與安全機制規格書 (v2.1)

本文件描述 Kids Vocabulary Generator 的內容檢舉系統、檔案封存策略與 AI 安全防護機制。

---

## 1. 檢舉與下架機制 (Report & Ban)

### 觸發條件 (Trigger)
*   **使用者回報**：使用者點選檢舉按鈕。
*   **門檻**：累積 **3 票** (Votes >= 3) 檢舉。
*   **範圍**：針對「單字」的檢舉（視為對該次生成結果的整體不滿意，包含圖與文）。

### 處理流程 (Archive Process)
當檢查到票數達標 (`banned`) 時，系統執行 **「完整封存與移除」 (Full Archive & Delete)** 流程：

1.  **資料庫封存 (Database Archive)**
    *   **來源**：`mnemonic_generations` (主要集合)
    *   **目標**：`mnemonic_generations_archive` (封存集合)
    *   **動作**：複製整筆文件，並加上以下 metadata：
        *   `archived_at`: 封存時間戳記 (ISO String)
        *   `archive_reason`: `'community_report_ban'`
        *   `final_votes`: 累積總票數

2.  **檔案搬移 (File Archive)**
    *   利用 GitHub API 執行檔案搬家。
    *   **來源路徑**：`public/library/[hash].jpg` (公開圖庫)
    *   **目標路徑**：`public/library/archive/[hash].jpg` (封存圖庫)
    *   **技術實作**：由於 GitHub API 無直接 Move 指令，採 `Copy` + `Delete` 方式確保原子性。
    *   **連結更新**：封存的資料庫紀錄中，圖片連結 (`github_url`) 會更新為封存路徑，保留可追溯性。

3.  **主資料移除 (Main Data Deletion)**
    *   確認上述兩步成功後，**刪除** `mnemonic_generations` 中的原始紀錄。
    *   **目的**：強制系統將該單字視為「未生成」，下次使用者查詢時觸發全新的 AI 生成流程。

---

## 2. AI 內容安全防護 (Content Safety Guardrails)

為防止 AI 生成恐怖、過度寫實或不適合兒童的內容，在 V2 生成流程中實施以下強制措施。

### 提示詞護欄 (Prompt Suffix)
在 LLM 分析完單字並產生描述後，程式會強制在結尾附加即便「安全後綴」：

```text
, cute kid-friendly style, soft colors, warm lighting, vector art, 3d render style, G-rated, masterpiece, best quality, no text, no scary elements
```

*   **cute kid-friendly style**: 強制可愛風格。
*   **soft colors, warm lighting**: 避免陰暗、高對比的恐怖氛圍。
*   **vector art, 3d render**: 避免過度寫實的照片風格。
*   **G-rated**: 美國電影分級的普遍級。
*   **no scary elements**: 明確禁止恐怖元素。
*   **no text**: 強制禁止圖片中出現文字 (DALL-E 3 常見問題)。

---

## 3. 資料流向圖 (Data Flow)

**正常流程**:
`User Query` -> `Check DB` -> `Found?` -> `Return Image`

**檢舉後流程**:
1. `User Report` -> `Votes++`
2. `Votes >= 3` -> **ARCHIVE TRIGGERED**
3. `Move DB Doc` -> `mnemonic_generations_archive`
4. `Move GitHub File` -> `public/library/archive/`
5. `Delete Main Doc`
6. `User Query (Retry)` -> `Check DB` -> `Not Found` -> **NEW GENERATION**

---

## 4. 分析與優化 (Future Analysis)
由於保留了完整的封存資料 (Prompt, Analysis, Image)，開發者可定期檢視 `_archive` 集合：
*   **分析誤判**：是否某些單字容易產生歧義？
*   **優化 Prompt**：根據被檢舉的圖片特徵，調整 System Prompt 或 Safety Suffix。
*   **模型調整**：若特定風格持續被檢舉，可更換 Pollinations 的繪圖模型 (如從 flux 改為其他)。
