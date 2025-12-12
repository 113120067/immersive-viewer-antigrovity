/**
 * Vocabulary Generator Frontend
 * 英文單字學習圖片生成前端邏輯
 */

import { initialize, onAuthStateChanged } from '/firebase-client.js';

class VocabularyGenerator {
  constructor() {
    this.isGenerating = false;
    this.currentUser = null;
    this.wordHistory = JSON.parse(localStorage.getItem('vocabularyHistory') || '[]');
    
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    try {
      await initialize();
      
      onAuthStateChanged(user => {
        this.currentUser = user;
        if (!user) {
          window.location.href = '/login.html';
          return;
        }
        
        this.showUserInfo(user);
        this.loadWordHistory();
        this.loadApiStatus();
      });
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize. Please refresh the page.');
    }
  }

  /**
   * 顯示用戶資訊
   */
  showUserInfo(user) {
    const userInfoElement = document.getElementById('userInfo');
    const userEmailElement = document.getElementById('userEmail');
    
    if (userEmailElement) {
      userEmailElement.textContent = user.email || user.displayName || 'User';
    }
    
    if (userInfoElement) {
      userInfoElement.style.display = 'block';
    }
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 表單提交
    const form = document.getElementById('vocabularyForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generateVocabularyImage();
    });

    // 快速設置按鈕
    const resetDefaultBtn = document.getElementById('resetDefaultBtn');
    const kidFriendlyBtn = document.getElementById('kidFriendlyBtn');
    const advancedBtn = document.getElementById('advancedBtn');

    if (resetDefaultBtn) {
      resetDefaultBtn.addEventListener('click', () => this.applyQuickSettings('default'));
    }
    if (kidFriendlyBtn) {
      kidFriendlyBtn.addEventListener('click', () => this.applyQuickSettings('kid-friendly'));
    }
    if (advancedBtn) {
      advancedBtn.addEventListener('click', () => this.applyQuickSettings('advanced'));
    }

    // 快速範例按鈕
    const exampleButtons = document.querySelectorAll('[data-word]');
    exampleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const word = button.getAttribute('data-word');
        const definition = button.getAttribute('data-definition');
        
        document.getElementById('wordInput').value = word;
        document.getElementById('definitionInput').value = definition;
        
        // 自動檢測單字類型
        this.autoDetectCategory(word, definition);
      });
    });

    // 單字輸入自動檢測
    const wordInput = document.getElementById('wordInput');
    wordInput.addEventListener('blur', () => {
      const word = wordInput.value.trim();
      const definition = document.getElementById('definitionInput').value.trim();
      if (word) {
        this.autoDetectCategory(word, definition);
      }
    });
  }

  /**
   * 應用快速設置
   */
  applyQuickSettings(settingType) {
    const providerSelect = document.getElementById('providerSelect');
    const categorySelect = document.getElementById('categorySelect');
    const styleSelect = document.getElementById('styleSelect');
    const levelSelect = document.getElementById('levelSelect');
    const techniqueSelect = document.getElementById('techniqueSelect');
    const includeTextCheck = document.getElementById('includeTextCheck');

    switch (settingType) {
      case 'default':
        // 你要求的預設設置：卡通風格、初學者、故事記憶
        providerSelect.value = '';
        categorySelect.value = 'auto';
        styleSelect.value = 'cartoon';
        levelSelect.value = 'beginner';
        techniqueSelect.value = 'story';
        includeTextCheck.checked = true;
        this.showSuccess('✅ Applied default settings: Cartoon style, Beginner level, Story memory');
        break;
        
      case 'kid-friendly':
        // 兒童友善設置
        providerSelect.value = '';
        categorySelect.value = 'auto';
        styleSelect.value = 'cartoon';
        levelSelect.value = 'beginner';
        techniqueSelect.value = 'emotion';
        includeTextCheck.checked = true;
        this.showSuccess('✅ Applied kid-friendly settings: Cartoon style with emotional memory');
        break;
        
      case 'advanced':
        // 進階設置
        providerSelect.value = '';
        categorySelect.value = 'auto';
        styleSelect.value = 'contextual';
        levelSelect.value = 'advanced';
        techniqueSelect.value = 'association';
        includeTextCheck.checked = false;
        this.showSuccess('✅ Applied advanced settings: Contextual style with association memory');
        break;
    }
  }

  /**
   * 自動檢測單字類型
   */
  autoDetectCategory(word, definition = '') {
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect.value !== 'auto') return;

    const wordLower = word.toLowerCase();
    
    // 簡單的單字類型檢測
    if (wordLower.endsWith('ing') || wordLower.endsWith('ed') || 
        ['run', 'jump', 'eat', 'sleep', 'walk', 'talk', 'read', 'write', 'play', 'work'].includes(wordLower)) {
      categorySelect.value = 'verb';
    }
    else if (['big', 'small', 'happy', 'sad', 'beautiful', 'ugly', 'fast', 'slow', 'good', 'bad'].includes(wordLower)) {
      categorySelect.value = 'adjective';
    }
    else if (['love', 'friendship', 'happiness', 'freedom', 'peace', 'justice'].includes(wordLower)) {
      categorySelect.value = 'abstract';
    }
    else {
      categorySelect.value = 'noun';
    }
  }

  /**
   * 生成單字學習圖片
   */
  async generateVocabularyImage() {
    if (this.isGenerating) return;

    const word = document.getElementById('wordInput').value.trim();
    const definition = document.getElementById('definitionInput').value.trim();
    const provider = document.getElementById('providerSelect').value;
    const category = document.getElementById('categorySelect').value;
    const style = document.getElementById('styleSelect').value;
    const level = document.getElementById('levelSelect').value;
    const technique = document.getElementById('techniqueSelect').value;
    const includeText = document.getElementById('includeTextCheck').checked;

    // 驗證輸入
    if (!word) {
      this.showError('Please enter an English word.');
      return;
    }

    if (word.length > 50) {
      this.showError('Word is too long. Please enter a single word or short phrase.');
      return;
    }

    try {
      this.isGenerating = true;
      this.showGenerationStatus(true);
      this.hideError();
      this.hideResult();

      // 生成專門的學習提示詞
      const prompt = this.generateLearningPrompt({
        word,
        definition,
        category: category === 'auto' ? 'noun' : category,
        style,
        level,
        technique,
        includeText
      });

      const token = await this.getAuthToken();
      
      const response = await fetch('/image-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          provider: provider || null, // 使用選擇的提供商或自動選擇
          size: '1024x1024', // 適合學習的正方形格式
          quality: 'standard',
          style: 'vivid'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showResult(data, { 
          word, 
          definition, 
          prompt,
          category: category === 'auto' ? 'noun' : category,
          style,
          level,
          technique
        });
        this.addToHistory({ word, definition, category, style, provider: data.provider, imageUrl: data.imageUrl });
      } else {
        let errorMessage = data.error || 'Failed to generate vocabulary image';
        
        // 特殊處理 Google Imagen 錯誤
        if (errorMessage.includes('Google Imagen is currently not available')) {
          errorMessage = '⚠️ Google Imagen is not available yet. Automatically switching to Azure OpenAI DALL-E...';
          
          // 自動切換到 Azure 並重試
          setTimeout(() => {
            document.getElementById('providerSelect').value = 'azure-openai';
            this.showInfo('Switched to Azure OpenAI. Please try generating again.');
          }, 2000);
        }
        
        this.showError(errorMessage);
      }

    } catch (error) {
      console.error('Generation error:', error);
      this.showError('Network error. Please try again.');
    } finally {
      this.isGenerating = false;
      this.showGenerationStatus(false);
    }
  }

  /**
   * 生成學習專用提示詞
   */
  generateLearningPrompt(options) {
    const { word, definition, category, style, level, technique, includeText } = options;
    
    let prompt = '';
    
    // 基礎提示詞根據風格
    switch (style) {
      case 'memory':
        prompt = `Create a clear, educational illustration that helps students remember the English word "${word}". `;
        break;
      case 'cartoon':
        prompt = `Create a friendly cartoon illustration of "${word}" that will help students remember this English vocabulary. `;
        break;
      case 'contextual':
        prompt = `Create a realistic scene showing "${word}" in a natural context that helps students understand when and how to use this word. `;
        break;
      case 'story':
        prompt = `Create an illustration that tells a short visual story involving "${word}". `;
        break;
      case 'conceptual':
        prompt = `Create a conceptual diagram or infographic showing "${word}" with visual elements that explain its meaning. `;
        break;
    }

    // 添加定義
    if (definition) {
      prompt += `The word means: ${definition}. `;
    }

    // 根據單字類型調整
    switch (category) {
      case 'noun':
        prompt += `Show the ${word} clearly as the main subject. Make it detailed and recognizable. `;
        break;
      case 'verb':
        prompt += `Show someone actively performing the action of ${word}. Make the action clear and dynamic. `;
        break;
      case 'adjective':
        prompt += `Show a clear visual example that demonstrates what ${word} means. Use contrasts if helpful. `;
        break;
      case 'abstract':
        prompt += `Use symbols, metaphors, and visual representations to make the abstract concept of ${word} concrete and memorable. `;
        break;
    }

    // 根據學習級別調整
    switch (level) {
      case 'beginner':
        prompt += `Use simple, clear imagery with minimal distractions. Focus on the most basic meaning. `;
        break;
      case 'intermediate':
        prompt += `Include some context and related elements to expand understanding. `;
        break;
      case 'advanced':
        prompt += `Show nuanced meanings and usage contexts with sophisticated details. `;
        break;
    }

    // 根據記憶技巧調整
    switch (technique) {
      case 'visual':
        prompt += `Make the image visually striking and memorable with bright, appealing colors. `;
        break;
      case 'association':
        prompt += `Include elements that create mental associations and connections with the word. `;
        break;
      case 'emotion':
        prompt += `Evoke positive emotions and feelings to enhance memory retention. `;
        break;
      case 'story':
        prompt += `Create a mini-narrative that makes the word unforgettable through storytelling. `;
        break;
      case 'contrast':
        prompt += `Use contrasts and comparisons to highlight the word's meaning clearly. `;
        break;
    }

    // 文字標籤
    if (includeText) {
      prompt += `Include the word "${word}" as a clear, readable label in the image. `;
    }

    // 通用學習要求
    prompt += `Style: educational, colorful, clean design, suitable for English language learning. High quality, clear meaning, perfect for vocabulary memorization.`;

    return prompt;
  }

  /**
   * 顯示生成結果
   */
  showResult(data, metadata) {
    const imageElement = document.getElementById('generatedImage');
    const wordTitleElement = document.getElementById('wordTitle');
    const wordDefinitionElement = document.getElementById('wordDefinition');
    const promptUsedElement = document.getElementById('promptUsed');
    const downloadLink = document.getElementById('downloadLink');
    const resultContainer = document.getElementById('imageResult');
    const placeholder = document.getElementById('placeholderContent');

    // 設置圖片
    imageElement.src = data.imageUrl;
    imageElement.alt = `Learning image for: ${metadata.word}`;

    // 設置單字資訊
    wordTitleElement.textContent = metadata.word.toUpperCase();
    wordDefinitionElement.textContent = metadata.definition || 'English vocabulary word';

    // 顯示使用的提示詞（簡化版）
    const shortPrompt = metadata.prompt.length > 100 ? 
      metadata.prompt.substring(0, 100) + '...' : metadata.prompt;
    promptUsedElement.innerHTML = `<strong>Prompt used:</strong> ${shortPrompt}`;

    // 設置下載連結
    downloadLink.href = data.imageUrl;
    downloadLink.download = `vocabulary-${metadata.word}-${Date.now()}.png`;

    // 顯示完整提示詞
    this.showPromptDetails(metadata.prompt, metadata);

    // 顯示提供商資訊
    this.showProviderInfo(data.provider, data.providerDisplayName);

    // 顯示結果
    placeholder.style.display = 'none';
    resultContainer.style.display = 'block';

    this.showSuccess(`Learning image for "${metadata.word}" generated successfully!`);
  }

  /**
   * 顯示提示詞詳細資訊
   */
  showPromptDetails(fullPrompt, metadata) {
    const promptDisplay = document.getElementById('promptDisplay');
    const promptText = document.getElementById('promptText');
    
    // 格式化提示詞顯示
    const formattedPrompt = this.formatPromptForDisplay(fullPrompt, metadata);
    promptText.innerHTML = formattedPrompt;
    
    // 顯示提示詞區域
    promptDisplay.style.display = 'block';
    
    // 設置切換按鈕
    this.setupPromptToggle();
  }

  /**
   * 格式化提示詞顯示
   */
  formatPromptForDisplay(prompt, metadata) {
    const { word, definition, category, style, level, technique } = metadata;
    
    let formatted = `
      <div class="prompt-analysis mb-3">
        <h6 class="text-primary mb-2">📊 Analysis for "${word}"</h6>
        <div class="row small">
          <div class="col-6">
            <strong>Category:</strong> ${category || 'auto'}<br>
            <strong>Style:</strong> ${style}<br>
            <strong>Level:</strong> ${level}
          </div>
          <div class="col-6">
            <strong>Technique:</strong> ${technique}<br>
            <strong>Definition:</strong> ${definition || 'Not provided'}
          </div>
        </div>
      </div>
      
      <div class="provider-info mb-3" id="providerInfo">
        <h6 class="text-success mb-2">🤖 AI Provider Used</h6>
        <div class="provider-badge" id="providerBadge">
          Loading provider information...
        </div>
      </div>
      
      <div class="prompt-full" id="promptFull" style="display: none;">
        <h6 class="text-success mb-2">🤖 Complete AI Prompt</h6>
        <div class="bg-white p-3 border rounded" style="font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre-wrap;">${prompt}</div>
      </div>
      
      <div class="prompt-breakdown mt-3">
        <h6 class="text-info mb-2">🔍 Prompt Breakdown</h6>
        <div class="small">
          ${this.analyzePromptComponents(prompt)}
        </div>
      </div>
    `;
    
    return formatted;
  }

  /**
   * 分析提示詞組成部分
   */
  analyzePromptComponents(prompt) {
    const components = [];
    
    if (prompt.includes('educational illustration')) {
      components.push('<span class="badge bg-primary me-1">Educational Focus</span>');
    }
    if (prompt.includes('cartoon')) {
      components.push('<span class="badge bg-success me-1">Cartoon Style</span>');
    }
    if (prompt.includes('realistic scene')) {
      components.push('<span class="badge bg-info me-1">Realistic Context</span>');
    }
    if (prompt.includes('story')) {
      components.push('<span class="badge bg-warning me-1">Story Element</span>');
    }
    if (prompt.includes('simple, clear imagery')) {
      components.push('<span class="badge bg-secondary me-1">Beginner Level</span>');
    }
    if (prompt.includes('visually striking')) {
      components.push('<span class="badge bg-danger me-1">Visual Impact</span>');
    }
    if (prompt.includes('emotions')) {
      components.push('<span class="badge bg-pink me-1">Emotional Memory</span>');
    }
    if (prompt.includes('associations')) {
      components.push('<span class="badge bg-purple me-1">Association Memory</span>');
    }
    
    return components.length > 0 ? components.join('') : '<span class="text-muted">Basic prompt structure</span>';
  }

  /**
   * 顯示提供商資訊
   */
  showProviderInfo(provider, providerDisplayName) {
    const providerBadge = document.getElementById('providerBadge');
    
    if (providerBadge && provider) {
      const providerIcon = provider === 'azure-openai' ? '🔷' : '🟢';
      const providerColor = provider === 'azure-openai' ? 'primary' : 'success';
      
      providerBadge.innerHTML = `
        <span class="badge bg-${providerColor} fs-6 p-2">
          ${providerIcon} ${providerDisplayName || provider}
        </span>
        <div class="small text-muted mt-1">
          This image was generated using ${providerDisplayName || provider}
        </div>
      `;
    }
  }

  /**
   * 設置提示詞切換功能
   */
  setupPromptToggle() {
    const toggleBtn = document.getElementById('togglePrompt');
    const promptFull = document.getElementById('promptFull');
    
    if (toggleBtn && promptFull) {
      toggleBtn.onclick = () => {
        if (promptFull.style.display === 'none') {
          promptFull.style.display = 'block';
          toggleBtn.innerHTML = '🙈 Hide Full Prompt';
        } else {
          promptFull.style.display = 'none';
          toggleBtn.innerHTML = '👁️ Show Full Prompt';
        }
      };
    }
  }

  /**
   * 添加到歷史記錄
   */
  addToHistory(item) {
    const historyItem = {
      ...item,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    this.wordHistory.unshift(historyItem);
    
    // 限制歷史記錄數量
    if (this.wordHistory.length > 20) {
      this.wordHistory = this.wordHistory.slice(0, 20);
    }
    
    localStorage.setItem('vocabularyHistory', JSON.stringify(this.wordHistory));
    this.loadWordHistory();
  }

  /**
   * 載入 API 狀態
   */
  async loadApiStatus() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/image-generator/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.config.providers) {
        this.updateApiStatus(data.config.providers);
      }
    } catch (error) {
      console.error('Failed to load API status:', error);
    }
  }

  /**
   * 更新 API 狀態顯示
   */
  updateApiStatus(providers) {
    const apiStatus = document.getElementById('apiStatus');
    const providerStatus = document.getElementById('providerStatus');
    
    if (apiStatus && providerStatus) {
      const statusBadges = providers.map(provider => {
        const icon = provider.name === 'azure-openai' ? '🔷' : '🟢';
        const color = provider.name === 'azure-openai' ? 'primary' : 'success';
        return `<span class="badge bg-${color} me-1">${icon} ${provider.displayName}</span>`;
      }).join('');
      
      // 如果沒有 Google Imagen，顯示說明
      const hasGoogle = providers.some(p => p.name === 'google-imagen');
      let statusHTML = statusBadges;
      
      if (!hasGoogle) {
        statusHTML += ' <span class="badge bg-secondary me-1">🟢 Google Imagen (Coming Soon)</span>';
      }
      
      providerStatus.innerHTML = statusHTML || '<span class="text-muted">No providers available</span>';
      apiStatus.style.display = 'block';
    }
  }

  /**
   * 載入單字歷史
   */
  loadWordHistory() {
    const historyElement = document.getElementById('wordHistory');
    
    if (this.wordHistory.length === 0) {
      historyElement.innerHTML = '<p class="text-muted">No words generated yet</p>';
      return;
    }
    
    const historyHTML = this.wordHistory.slice(0, 10).map(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const providerIcon = item.provider === 'azure-openai' ? '🔷' : 
                          item.provider === 'google-imagen' ? '🟢' : '🤖';
      const providerName = item.provider === 'azure-openai' ? 'Azure' : 
                          item.provider === 'google-imagen' ? 'Google' : 'Auto';
      return `
        <div class="border-bottom pb-2 mb-2">
          <strong>${item.word}</strong> ${providerIcon}
          <br><small class="text-muted">${item.definition || 'No definition'}</small>
          <br><small class="text-info">${date} - ${item.style} style - ${providerName}</small>
        </div>
      `;
    }).join('');
    
    historyElement.innerHTML = historyHTML;
  }

  /**
   * 顯示生成狀態
   */
  showGenerationStatus(show) {
    const statusElement = document.getElementById('generationStatus');
    const generateBtn = document.getElementById('generateBtn');

    if (show) {
      statusElement.style.display = 'block';
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Learning Image...';
    } else {
      statusElement.style.display = 'none';
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Learning Image';
    }
  }

  /**
   * 隱藏結果
   */
  hideResult() {
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('placeholderContent').style.display = 'block';
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      this.hideError();
    }, 8000);
  }

  /**
   * 隱藏錯誤訊息
   */
  hideError() {
    document.getElementById('errorMessage').style.display = 'none';
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show mt-3';
    successAlert.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.card-body');
    container.insertBefore(successAlert, container.firstChild);
    
    setTimeout(() => {
      if (successAlert.parentNode) {
        successAlert.remove();
      }
    }, 5000);
  }

  /**
   * 獲取認證 Token
   */
  async getAuthToken() {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }
    return await this.currentUser.getIdToken();
  }
}

// 初始化
let vocabularyGenerator;
document.addEventListener('DOMContentLoaded', () => {
  vocabularyGenerator = new VocabularyGenerator();
});

export default VocabularyGenerator;