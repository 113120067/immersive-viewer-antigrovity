# 英文單字學習圖片提示詞設計指南

## 概述

本系統專門為英文單字學習設計了智能提示詞生成器，能夠根據不同的學習需求和單字特性，自動生成最適合的 AI 圖片生成提示詞。

## 核心設計原理

### 1. 教育導向設計
- **清晰性優先**: 圖片必須清楚表達單字含義，避免歧義
- **記憶輔助**: 使用視覺記憶技巧幫助學生記住單字
- **適齡設計**: 根據學習者程度調整複雜度和風格

### 2. 多維度提示詞架構

#### A. 基礎風格模板
```javascript
memory: "Create a clear, educational illustration that helps students remember..."
cartoon: "Create a friendly cartoon illustration..."
contextual: "Create a realistic scene showing the word in natural context..."
story: "Create an illustration that tells a short visual story..."
conceptual: "Create a conceptual diagram or infographic..."
```

#### B. 單字類型特化
- **名詞 (Noun)**: 強調物體的清晰展示和特徵識別
- **動詞 (Verb)**: 重點表現動作的動態性和過程
- **形容詞 (Adjective)**: 使用對比和視覺範例展示特質
- **抽象概念**: 運用符號和隱喻具象化抽象概念

#### C. 學習級別調整
- **初學者**: 簡單清晰，最小干擾，基礎含義
- **中級**: 包含情境和相關詞彙擴展理解
- **高級**: 展示細緻含義和使用情境

### 3. 記憶技巧整合

#### 視覺衝擊 (Visual Impact)
```
"Make the image visually striking and memorable with bright, appealing colors"
```

#### 聯想記憶 (Association)
```
"Include elements that create mental associations and connections with the word"
```

#### 情感記憶 (Emotional)
```
"Evoke positive emotions and feelings to enhance memory retention"
```

#### 故事記憶 (Story-based)
```
"Create a mini-narrative that makes the word unforgettable through storytelling"
```

#### 對比記憶 (Contrast)
```
"Use contrasts and comparisons to highlight the word's meaning clearly"
```

## 實際應用範例

### 範例 1: 名詞 "Apple"
**基礎提示詞**:
```
Create a clear, educational illustration that helps students remember the English word "apple". 
The word means: a round red or green fruit that grows on trees. 
Show the apple clearly as the main subject. Make it detailed and recognizable. 
Use simple, clear imagery with minimal distractions. Focus on the most basic meaning. 
Make the image visually striking and memorable with bright, appealing colors. 
Style: educational, colorful, clean design, suitable for English language learning.
```

### 範例 2: 動詞 "Running"
**基礎提示詞**:
```
Create a realistic scene showing "running" in a natural context that helps students 
understand when and how to use this word. The word means: moving quickly on foot. 
Show someone actively performing the action of running. Make the action clear and dynamic. 
Include some context and related elements to expand understanding. 
Include elements that create mental associations and connections with the word. 
Style: educational, colorful, clean design, suitable for English language learning.
```

### 範例 3: 形容詞 "Happy"
**基礎提示詞**:
```
Create a friendly cartoon illustration of "happy" that will help students remember 
this English vocabulary. The word means: feeling joy and pleasure. 
Show a clear visual example that demonstrates what happy means. Use contrasts if helpful. 
Use simple, clear imagery with minimal distractions. Focus on the most basic meaning. 
Evoke positive emotions and feelings to enhance memory retention. 
Style: educational, colorful, clean design, suitable for English language learning.
```

### 範例 4: 抽象概念 "Friendship"
**基礎提示詞**:
```
Create a conceptual diagram or infographic showing "friendship" with visual elements 
that explain its meaning. The word means: a close relationship between people. 
Use symbols, metaphors, and visual representations to make the abstract concept 
of friendship concrete and memorable. 
Show nuanced meanings and usage contexts with sophisticated details. 
Create a mini-narrative that makes the word unforgettable through storytelling. 
Style: educational, colorful, clean design, suitable for English language learning.
```

## 進階功能

### 1. 智能單字分析
系統會自動分析輸入的單字，推薦最適合的：
- 單字類型 (名詞/動詞/形容詞/抽象)
- 視覺風格 (記憶輔助/卡通/情境/故事/概念圖)
- 記憶技巧 (視覺/聯想/情感/故事/對比)

### 2. 多變體生成
為同一個單字生成多種不同風格的提示詞：
- 記憶輔助風格：清晰教育插圖
- 卡通風格：友善有趣的卡通
- 情境風格：真實使用場景

### 3. 主題集合
生成包含多個相關單字的主題圖片：
```javascript
generateThemePrompt(['cat', 'dog', 'bird', 'fish'], 'Animals', 'memory')
```

## 最佳實踐建議

### 1. 提示詞優化原則
- **具體明確**: 避免模糊的描述，使用具體的視覺指導
- **教育導向**: 始終以學習效果為優先考量
- **文化適應**: 考慮不同文化背景的學習者需求
- **質量控制**: 包含高質量、清晰含義的要求

### 2. 學習效果最大化
- **視覺記憶**: 利用顏色、形狀、對比增強記憶
- **情境學習**: 在真實情境中展示單字使用
- **多感官刺激**: 結合視覺、情感、故事元素
- **重複強化**: 通過不同角度重複展示概念

### 3. 技術實現要點
- **模組化設計**: 可組合的提示詞組件
- **參數化控制**: 靈活調整各種學習參數
- **智能推薦**: 基於單字特性自動推薦最佳策略
- **品質保證**: 統一的教育標準和視覺要求

## 系統架構

```
VocabularyPromptGenerator
├── basePrompts (基礎風格模板)
├── categoryPrompts (單字類型特化)
├── levelAdjustments (學習級別調整)
├── memoryTechniques (記憶技巧)
├── generatePrompt() (主要生成方法)
├── generateVariations() (變體生成)
├── analyzeAndRecommend() (智能分析)
└── generateThemePrompt() (主題生成)
```

這個系統提供了完整的英文單字學習圖片生成解決方案，能夠根據不同的教學需求和學習者特點，自動生成最適合的 AI 圖片提示詞。