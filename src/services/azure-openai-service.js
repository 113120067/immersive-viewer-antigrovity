/**
 * Azure OpenAI Service
 * 提供 DALL-E 圖片生成功能
 */

const { AzureOpenAI } = require('openai');
const usageLimiter = require('./usage-limiter');

class AzureOpenAIService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentName = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3';
    
    this.init();
  }

  /**
   * 初始化 Azure OpenAI 客戶端
   */
  init() {
    if (!this.endpoint) {
      console.warn('⚠️ Warning: AZURE_OPENAI_ENDPOINT not set');
      console.warn('⚠️ Image generation features will not work');
      return;
    }

    try {
      if (this.apiKey) {
        // 使用 API Key 認證
        this.client = new AzureOpenAI({
          endpoint: this.endpoint,
          apiKey: this.apiKey,
          apiVersion: '2024-02-01'
        });
      } else {
        console.warn('⚠️ AZURE_OPENAI_API_KEY not set, service will not be available');
        return;
      }

      this.initialized = true;
      console.log('✅ Azure OpenAI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI service:', error.message);
    }
  }

  /**
   * 檢查服務是否可用
   */
  isAvailable() {
    return this.initialized && this.client;
  }

  /**
   * 生成圖片
   * @param {Object} params - 生成參數
   * @param {string} params.prompt - 圖片描述提示
   * @param {string} params.size - 圖片尺寸 ('1024x1024', '1792x1024', '1024x1792')
   * @param {string} params.quality - 圖片品質 ('standard', 'hd')
   * @param {string} params.style - 圖片風格 ('vivid', 'natural')
   * @param {string} params.userId - 使用者 ID（用於記錄）
   * @returns {Promise<Object>} - 生成結果
   */
  async generateImage({ prompt, size = '1024x1024', quality = 'standard', style = 'vivid', userId }) {
    if (!this.isAvailable()) {
      throw new Error('Azure OpenAI service is not available');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // 檢查使用限制
    const limitCheck = await usageLimiter.checkUserLimit(userId, size, quality);
    if (!limitCheck.allowed) {
      throw new Error(`使用限制: ${limitCheck.reason}`);
    }

    // 驗證參數
    const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
    const validQualities = ['standard', 'hd'];
    const validStyles = ['vivid', 'natural'];

    if (!validSizes.includes(size)) {
      throw new Error(`Invalid size. Must be one of: ${validSizes.join(', ')}`);
    }

    if (!validQualities.includes(quality)) {
      throw new Error(`Invalid quality. Must be one of: ${validQualities.join(', ')}`);
    }

    if (!validStyles.includes(style)) {
      throw new Error(`Invalid style. Must be one of: ${validStyles.join(', ')}`);
    }

    try {
      console.log(`🎨 Generating image for user ${userId}:`, {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        size,
        quality,
        style
      });

      const result = await this.client.images.generate({
        prompt: prompt,
        model: this.deploymentName,
        n: 1,
        size: size,
        quality: quality,
        style: style,
        response_format: 'url'
      });

      if (!result.data || result.data.length === 0) {
        throw new Error('No image generated');
      }

      const imageData = result.data[0];
      
      // 記錄使用量
      await usageLimiter.recordUsage(userId, size, quality, true);
      
      console.log('✅ Image generated successfully');

      return {
        success: true,
        imageUrl: imageData.url,
        revisedPrompt: imageData.revised_prompt || prompt,
        size: size,
        quality: quality,
        style: style,
        generatedAt: new Date().toISOString(),
        userId: userId,
        usageInfo: limitCheck.userStats
      };

    } catch (error) {
      console.error('❌ Image generation failed:', error.message);
      
      // 記錄失敗的嘗試（不計入使用量）
      await usageLimiter.recordUsage(userId, size, quality, false);
      
      // 處理常見錯誤
      if (error.message.includes('使用限制')) {
        throw error; // 直接拋出使用限制錯誤
      } else if (error.message.includes('content_policy_violation')) {
        throw new Error('Content policy violation: The prompt contains content that is not allowed');
      } else if (error.message.includes('rate_limit_exceeded')) {
        throw new Error('Rate limit exceeded: Please try again later');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('Insufficient quota: Please check your Azure OpenAI subscription');
      } else {
        throw new Error(`Image generation failed: ${error.message}`);
      }
    }
  }

  /**
   * 驗證提示詞內容
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

    if (trimmedPrompt.length > 4000) {
      return { valid: false, error: 'Prompt is too long (maximum 4000 characters)' };
    }

    // 基本內容過濾（可以根據需要擴展）
    const prohibitedWords = [
      'violence', 'violent', 'blood', 'gore', 'weapon', 'gun', 'knife',
      'nude', 'naked', 'sexual', 'porn', 'adult', 'explicit',
      'hate', 'racist', 'discrimination'
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
   * 獲取支援的功能和限制
   * @returns {Object} - 功能配置
   */
  getCapabilities() {
    return {
      maxPromptLength: 4000,
      supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
      supportedQualities: ['standard', 'hd'],
      supportedStyles: ['vivid', 'natural'],
      features: {
        textToImage: true,
        imageEditing: false,
        styleTransfer: false,
        inpainting: false
      },
      pricing: {
        textToImage: 'Pay per generation',
        hdQuality: 'Higher cost for HD'
      }
    };
  }

  /**
   * 獲取使用統計
   * @param {string} userId - 使用者 ID
   * @returns {Object} - 使用統計
   */
  async getUsageStats(userId) {
    try {
      const report = await usageLimiter.getUsageReport(userId);
      return {
        userId: userId,
        provider: 'azure-openai',
        totalImages: report.user?.monthlyCount || 0,
        todayImages: report.user?.dailyCount || 0,
        monthlyImages: report.user?.monthlyCount || 0,
        dailyCost: report.user?.dailyCost || 0,
        monthlyCost: report.user?.monthlyCost || 0,
        lastGenerated: report.user?.lastUsed,
        limits: report.limits
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        userId: userId,
        provider: 'azure-openai',
        totalImages: 0,
        todayImages: 0,
        monthlyImages: 0,
        lastGenerated: null,
        error: error.message
      };
    }
  }
}

// 創建單例實例
const azureOpenAIService = new AzureOpenAIService();

module.exports = azureOpenAIService;