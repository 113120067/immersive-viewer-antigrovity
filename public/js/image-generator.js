/**
 * Image Generator Frontend
 * Azure OpenAI DALL-E 圖片生成前端邏輯
 */

import { initialize, onAuthStateChanged } from '/firebase-client.js';

class ImageGenerator {
  constructor() {
    this.isGenerating = false;
    this.config = null;
    this.currentUser = null;
    
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
          // 如果未登入，重定向到登入頁面
          window.location.href = '/login.html';
          return;
        }
        
        // 顯示用戶資訊
        this.showUserInfo(user);
        
        this.loadConfig();
        this.loadUsageStats();
      });
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize. Please refresh the page.');
    }
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 表單提交
    const form = document.getElementById('imageGeneratorForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generateImage();
    });

    // 提示詞顯示切換
    const showPromptBtn = document.getElementById('showPromptBtn');
    const hidePromptBtn = document.getElementById('hidePromptBtn');
    const promptInfo = document.getElementById('promptInfo');

    if (showPromptBtn) {
      showPromptBtn.addEventListener('click', () => {
        promptInfo.style.display = 'block';
        showPromptBtn.style.display = 'none';
      });
    }

    if (hidePromptBtn) {
      hidePromptBtn.addEventListener('click', () => {
        promptInfo.style.display = 'none';
        document.getElementById('showPromptBtn').style.display = 'inline-block';
      });
    }

    // 字符計數
    const promptInput = document.getElementById('promptInput');
    const charCount = document.getElementById('charCount');
    const maxChars = document.getElementById('maxChars');
    
    promptInput.addEventListener('input', () => {
      const count = promptInput.value.length;
      const maxLength = parseInt(maxChars.textContent);
      charCount.textContent = count;
      
      if (count > maxLength) {
        charCount.style.color = 'red';
      } else if (count > maxLength * 0.9) {
        charCount.style.color = 'orange';
      } else {
        charCount.style.color = '';
      }
    });

    // 提供商選擇
    const providerSelect = document.getElementById('providerSelect');
    providerSelect.addEventListener('change', () => {
      this.updateProviderOptions();
    });

    // 品質選擇提示
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
      qualitySelect.addEventListener('change', () => {
        if (qualitySelect.value === 'hd') {
          this.showInfo('HD quality will produce higher quality images but costs more.');
        }
      });
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
   * 載入配置
   */
  async loadConfig() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/image-generator/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.config = data.config;
        
        if (!this.config.available) {
          this.showError('Image generation service is not available. Please contact administrator.');
          document.getElementById('generateBtn').disabled = true;
        } else {
          this.setupProviderOptions();
          this.updateMaxCharacters();
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  /**
   * 載入使用統計
   */
  async loadUsageStats() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/image-generator/usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.updateUsageStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      document.getElementById('usageStats').textContent = 'Failed to load statistics';
    }
  }

  /**
   * 更新使用統計顯示
   */
  updateUsageStats(stats) {
    const statsElement = document.getElementById('usageStats');
    statsElement.innerHTML = `
      <div>Total images: ${stats.totalImages}</div>
      <div>Today: ${stats.todayImages}</div>
      <div>This month: ${stats.monthlyImages}</div>
      ${stats.lastGenerated ? `<div>Last generated: ${new Date(stats.lastGenerated).toLocaleString()}</div>` : ''}
    `;
  }

  /**
   * 生成圖片
   */
  async generateImage() {
    if (this.isGenerating) return;

    const prompt = document.getElementById('promptInput').value.trim();
    const provider = document.getElementById('providerSelect').value || null;
    
    // 獲取所有參數
    const params = this.getGenerationParams();

    // 驗證輸入
    if (!prompt) {
      this.showError('Please enter a description for your image.');
      return;
    }

    const maxLength = this.config?.maxPromptLength || 2000;
    if (prompt.length > maxLength) {
      this.showError(`Description is too long. Maximum ${maxLength} characters.`);
      return;
    }

    try {
      this.isGenerating = true;
      this.showGenerationStatus(true);
      this.hideError();
      this.hideResult();

      const token = await this.getAuthToken();
      
      const response = await fetch('/image-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          provider: provider,
          ...params
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showResult(data);
        this.showPromptInfo(prompt); // 顯示使用的提示詞
        this.showProviderInfo(data.provider, data.providerDisplayName); // 顯示提供商資訊
        this.loadUsageStats(); // 重新載入統計
      } else {
        this.showError(data.error || 'Failed to generate image');
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
   * 顯示生成結果
   */
  showResult(data) {
    const imageElement = document.getElementById('generatedImage');
    const revisedPromptElement = document.getElementById('revisedPrompt');
    const downloadLink = document.getElementById('downloadLink');
    const resultContainer = document.getElementById('imageResult');
    const placeholder = document.getElementById('placeholderContent');

    // 設置圖片
    imageElement.src = data.imageUrl;
    imageElement.alt = data.revisedPrompt || 'Generated image';

    // 設置修訂後的提示詞
    if (data.revisedPrompt && data.revisedPrompt !== document.getElementById('promptInput').value.trim()) {
      revisedPromptElement.innerHTML = `<strong>Revised prompt:</strong> ${data.revisedPrompt}`;
      revisedPromptElement.style.display = 'block';
    } else {
      revisedPromptElement.style.display = 'none';
    }

    // 設置下載連結
    downloadLink.href = data.imageUrl;
    downloadLink.download = `ai-image-${Date.now()}.png`;

    // 顯示結果，隱藏佔位符
    placeholder.style.display = 'none';
    resultContainer.style.display = 'block';

    // 成功提示
    this.showSuccess('Image generated successfully!');
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
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    } else {
      statusElement.style.display = 'none';
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Image';
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
    
    // 自動隱藏
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
    // 創建臨時成功提示
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show mt-3';
    successAlert.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.card-body');
    container.insertBefore(successAlert, container.firstChild);
    
    // 自動移除
    setTimeout(() => {
      if (successAlert.parentNode) {
        successAlert.remove();
      }
    }, 5000);
  }

  /**
   * 顯示資訊提示
   */
  showInfo(message) {
    // 創建臨時資訊提示
    const infoAlert = document.createElement('div');
    infoAlert.className = 'alert alert-info alert-dismissible fade show mt-2';
    infoAlert.innerHTML = `
      <i class="fas fa-info-circle me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const qualitySelect = document.getElementById('qualitySelect');
    qualitySelect.parentNode.appendChild(infoAlert);
    
    // 自動移除
    setTimeout(() => {
      if (infoAlert.parentNode) {
        infoAlert.remove();
      }
    }, 4000);
  }

  /**
   * 設置提供商選項
   */
  setupProviderOptions() {
    const providerSelect = document.getElementById('providerSelect');
    
    // 清空現有選項（保留 Auto 選項）
    while (providerSelect.children.length > 1) {
      providerSelect.removeChild(providerSelect.lastChild);
    }
    
    // 添加可用提供商
    if (this.config.providers) {
      this.config.providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.name;
        option.textContent = provider.displayName;
        providerSelect.appendChild(option);
      });
    }
    
    this.updateProviderOptions();
  }

  /**
   * 更新提供商特定選項的顯示
   */
  updateProviderOptions() {
    const provider = document.getElementById('providerSelect').value;
    const azureOptions = document.querySelector('.azure-options');
    const googleOptions = document.querySelector('.google-options');
    const pollinationsOptions = document.querySelector('.pollinations-options');
    
    // 隱藏所有選項
    azureOptions.style.display = 'none';
    googleOptions.style.display = 'none';
    pollinationsOptions.style.display = 'none';
    
    // 根據選擇的提供商顯示對應選項
    if (provider === 'azure-openai' || (!provider && this.config.defaultProvider === 'azure-openai')) {
      azureOptions.style.display = 'block';
    } else if (provider === 'google-imagen' || (!provider && this.config.defaultProvider === 'google-imagen')) {
      googleOptions.style.display = 'block';
    } else if (provider === 'pollinations' || (!provider && this.config.defaultProvider === 'pollinations')) {
      pollinationsOptions.style.display = 'block';
    } else if (!provider) {
      // Auto 模式：顯示預設提供商的選項
      if (this.config.defaultProvider === 'pollinations') {
        pollinationsOptions.style.display = 'block';
      } else if (this.config.defaultProvider === 'azure-openai') {
        azureOptions.style.display = 'block';
      } else if (this.config.defaultProvider === 'google-imagen') {
        googleOptions.style.display = 'block';
      }
    }
  }

  /**
   * 更新最大字符數顯示
   */
  updateMaxCharacters() {
    const maxChars = document.getElementById('maxChars');
    if (maxChars && this.config.maxPromptLength) {
      maxChars.textContent = this.config.maxPromptLength;
    }
  }

  /**
   * 獲取生成參數
   */
  getGenerationParams() {
    const params = {};
    
    // Azure OpenAI 參數
    const sizeSelect = document.getElementById('sizeSelect');
    const qualitySelect = document.getElementById('qualitySelect');
    const styleSelect = document.getElementById('styleSelect');
    
    if (sizeSelect && sizeSelect.value) params.size = sizeSelect.value;
    if (qualitySelect && qualitySelect.value) params.quality = qualitySelect.value;
    if (styleSelect && styleSelect.value) params.style = styleSelect.value;
    
    // Google Imagen 參數
    const aspectRatioSelect = document.getElementById('aspectRatioSelect');
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    const seedInput = document.getElementById('seedInput');
    
    if (aspectRatioSelect && aspectRatioSelect.value) params.aspectRatio = aspectRatioSelect.value;
    if (outputFormatSelect && outputFormatSelect.value) params.outputFormat = outputFormatSelect.value;
    if (seedInput && seedInput.value) params.seed = parseInt(seedInput.value);
    
    // Pollinations 參數
    const pollinationsWidthSelect = document.getElementById('pollinationsWidthSelect');
    const pollinationsHeightSelect = document.getElementById('pollinationsHeightSelect');
    const pollinationsModelSelect = document.getElementById('pollinationsModelSelect');
    const pollinationsSeedInput = document.getElementById('pollinationsSeedInput');
    const pollinationsEnhanceCheck = document.getElementById('pollinationsEnhanceCheck');
    
    if (pollinationsWidthSelect && pollinationsWidthSelect.value) params.width = parseInt(pollinationsWidthSelect.value);
    if (pollinationsHeightSelect && pollinationsHeightSelect.value) params.height = parseInt(pollinationsHeightSelect.value);
    if (pollinationsModelSelect && pollinationsModelSelect.value) params.model = pollinationsModelSelect.value;
    if (pollinationsSeedInput && pollinationsSeedInput.value) params.seed = parseInt(pollinationsSeedInput.value);
    if (pollinationsEnhanceCheck) params.enhance = pollinationsEnhanceCheck.checked;
    
    return params;
  }

  /**
   * 顯示提示詞資訊
   */
  showPromptInfo(prompt) {
    const promptContent = document.getElementById('promptContent');
    const showPromptBtn = document.getElementById('showPromptBtn');
    
    if (promptContent && prompt) {
      promptContent.textContent = prompt;
      showPromptBtn.style.display = 'inline-block';
    }
  }

  /**
   * 顯示提供商資訊
   */
  showProviderInfo(provider, providerDisplayName) {
    const providerInfoMain = document.getElementById('providerInfoMain');
    const providerName = document.getElementById('providerName');
    
    if (providerInfoMain && providerName && provider) {
      const providerIcon = provider === 'azure-openai' ? '🔷' : '🟢';
      providerName.innerHTML = `${providerIcon} ${providerDisplayName || provider}`;
      providerInfoMain.style.display = 'block';
    }
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
let imageGenerator;
document.addEventListener('DOMContentLoaded', () => {
  imageGenerator = new ImageGenerator();
});

export default ImageGenerator;