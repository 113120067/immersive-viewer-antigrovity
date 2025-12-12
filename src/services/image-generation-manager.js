/**
 * Image Generation Manager
 * 統一管理多個圖片生成服務提供商
 */

const azureOpenAIService = require('./azure-openai-service');
const googleImagenService = require('./google-imagen-service');
const pollinationsService = require('./pollinations-service');

class ImageGenerationManager {
  constructor() {
    this.providers = {
      'azure-openai': azureOpenAIService,
      'google-imagen': googleImagenService,
      'pollinations': pollinationsService
    };
    
    this.defaultProvider = process.env.DEFAULT_IMAGE_PROVIDER || 'pollinations';
    this.fallbackProvider = 'azure-openai';
  }

  /**
   * 獲取可用的提供商列表
   * @returns {Array} - 可用提供商列表
   */
  getAvailableProviders() {
    const available = [];
    
    Object.keys(this.providers).forEach(providerName => {
      const provider = this.providers[providerName];
      if (provider.isAvailable()) {
        available.push({
          name: providerName,
          displayName: this.getProviderDisplayName(providerName),
          capabilities: provider.getCapabilities ? provider.getCapabilities() : {}
        });
      }
    });
    
    return available;
  }

  /**
   * 獲取提供商顯示名稱
   * @param {string} providerName - 提供商名稱
   * @returns {string} - 顯示名稱
   */
  getProviderDisplayName(providerName) {
    const displayNames = {
      'azure-openai': 'Azure OpenAI DALL-E',
      'google-imagen': 'Google Imagen',
      'pollinations': 'Pollinations (Free AI)'
    };
    
    return displayNames[providerName] || providerName;
  }

  /**
   * 選擇最佳可用提供商
   * @param {string} preferredProvider - 偏好的提供商
   * @returns {Object} - 選中的提供商服務
   */
  selectProvider(preferredProvider = null) {
    // 如果指定了偏好提供商且可用，使用它
    if (preferredProvider && this.providers[preferredProvider]?.isAvailable()) {
      return {
        name: preferredProvider,
        service: this.providers[preferredProvider]
      };
    }

    // 嘗試使用預設提供商
    if (this.providers[this.defaultProvider]?.isAvailable()) {
      return {
        name: this.defaultProvider,
        service: this.providers[this.defaultProvider]
      };
    }

    // 嘗試使用備用提供商
    if (this.providers[this.fallbackProvider]?.isAvailable()) {
      return {
        name: this.fallbackProvider,
        service: this.providers[this.fallbackProvider]
      };
    }

    // 尋找任何可用的提供商
    for (const [name, service] of Object.entries(this.providers)) {
      if (service.isAvailable()) {
        return { name, service };
      }
    }

    throw new Error('No image generation providers are available');
  }

  /**
   * 生成圖片（自動選擇提供商）
   * @param {Object} params - 生成參數
   * @param {string} params.prompt - 圖片描述
   * @param {string} params.provider - 指定提供商（可選）
   * @param {Object} params.options - 提供商特定選項
   * @param {string} params.userId - 使用者 ID
   * @returns {Promise<Object>} - 生成結果
   */
  async generateImage({ prompt, provider, options = {}, userId }) {
    try {
      const selectedProvider = this.selectProvider(provider);
      
      console.log(`🎨 Using provider: ${selectedProvider.name} for user: ${userId}`);

      // 根據不同提供商調整參數
      let providerParams = { prompt, userId };

      if (selectedProvider.name === 'azure-openai') {
        // Azure OpenAI 參數
        providerParams = {
          ...providerParams,
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          style: options.style || 'vivid'
        };
      } else if (selectedProvider.name === 'google-imagen') {
        // Google Imagen 參數
        providerParams = {
          ...providerParams,
          aspectRatio: options.aspectRatio || '1:1',
          outputFormat: options.outputFormat || 'image/jpeg',
          seed: options.seed
        };
      } else if (selectedProvider.name === 'pollinations') {
        // Pollinations 參數
        providerParams = {
          ...providerParams,
          width: options.width || 1024,
          height: options.height || 1024,
          model: options.model || 'flux',
          seed: options.seed,
          enhance: options.enhance !== false
        };
      }

      const result = await selectedProvider.service.generateImage(providerParams);
      
      // 添加提供商資訊到結果
      result.provider = selectedProvider.name;
      result.providerDisplayName = this.getProviderDisplayName(selectedProvider.name);

      return result;

    } catch (error) {
      console.error(`❌ Image generation failed with provider ${provider || 'auto'}:`, error.message);
      
      // 如果指定了提供商但失敗，嘗試備用提供商
      if (provider && provider !== this.defaultProvider) {
        console.log(`🔄 Trying fallback provider: ${this.defaultProvider}`);
        
        try {
          return await this.generateImage({
            prompt,
            provider: this.defaultProvider,
            options,
            userId
          });
        } catch (fallbackError) {
          console.error(`❌ Fallback provider also failed:`, fallbackError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * 驗證提示詞（使用最嚴格的標準）
   * @param {string} prompt - 提示詞
   * @returns {Object} - 驗證結果
   */
  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a non-empty string' };
    }

    const trimmedPrompt = prompt.trim();
    
    if (trimmedPrompt.length === 0) {
      return { valid: false, error: 'Prompt cannot be empty' };
    }

    // 使用最嚴格的長度限制（Google Imagen 的 2000 字符）
    if (trimmedPrompt.length > 2000) {
      return { valid: false, error: 'Prompt is too long (maximum 2000 characters)' };
    }

    // 統一的內容過濾
    const prohibitedWords = [
      'violence', 'violent', 'blood', 'gore', 'weapon', 'gun', 'knife',
      'nude', 'naked', 'sexual', 'porn', 'adult', 'explicit',
      'hate', 'racist', 'discrimination', 'illegal', 'drugs'
    ];

    const lowerPrompt = trimmedPrompt.toLowerCase();
    const foundProhibited = prohibitedWords.find(word => lowerPrompt.includes(word));
    
    if (foundProhibited) {
      return { 
        valid: false, 
        error: `Prompt contains prohibited content: "${foundProhibited}"` 
      };
    }

    return { valid: true, prompt: trimmedPrompt };
  }

  /**
   * 獲取統合的使用統計
   * @param {string} userId - 使用者 ID
   * @returns {Promise<Object>} - 統合統計
   */
  async getUsageStats(userId) {
    const stats = {
      userId: userId,
      providers: {},
      total: {
        totalImages: 0,
        todayImages: 0,
        monthlyImages: 0
      }
    };

    // 收集各提供商的統計
    for (const [name, service] of Object.entries(this.providers)) {
      if (service.isAvailable() && service.getUsageStats) {
        try {
          const providerStats = await service.getUsageStats(userId);
          stats.providers[name] = providerStats;
          
          // 累加總計
          stats.total.totalImages += providerStats.totalImages || 0;
          stats.total.todayImages += providerStats.todayImages || 0;
          stats.total.monthlyImages += providerStats.monthlyImages || 0;
        } catch (error) {
          console.error(`Failed to get stats from ${name}:`, error.message);
        }
      }
    }

    return stats;
  }

  /**
   * 獲取系統配置
   * @returns {Object} - 系統配置
   */
  getSystemConfig() {
    const availableProviders = this.getAvailableProviders();
    
    return {
      available: availableProviders.length > 0,
      providers: availableProviders,
      defaultProvider: this.defaultProvider,
      fallbackProvider: this.fallbackProvider,
      features: {
        multiProvider: true,
        autoFallback: true,
        providerSelection: true
      }
    };
  }
}

// 創建單例實例
const imageGenerationManager = new ImageGenerationManager();

module.exports = imageGenerationManager;