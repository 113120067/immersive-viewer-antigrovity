/**
 * Google Gemini Imagen Service
 * 提供 Google AI Imagen 圖片生成功能
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GoogleImagenService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.apiKey = process.env.GOOGLE_AI_API_KEY;
    this.model = null;
    
    this.init();
  }

  /**
   * 初始化 Google AI 客戶端
   */
  init() {
    if (!this.apiKey) {
      console.warn('⚠️ Warning: GOOGLE_AI_API_KEY not set');
      console.warn('⚠️ Google Imagen features will not work');
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(this.apiKey);
      // 注意：Google Gemini API 目前主要支援文字生成，圖片生成功能可能需要不同的 API
      // 暫時使用 gemini-pro 模型來測試連接
      this.model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      
      this.initialized = true;
      console.log('⚠️ Google AI client initialized, but Imagen (image generation) is not available');
      console.log('ℹ️ Google Gemini API currently does not support direct image generation');
      console.log('ℹ️ Please use Azure OpenAI DALL-E for image generation');
    } catch (error) {
      console.error('❌ Failed to initialize Google Imagen service:', error.message);
    }
  }

  /**
   * 檢查服務是否可用
   */
  isAvailable() {
    // 暫時返回 false，因為 Google Gemini API 不支援直接圖片生成
    return false;
  }

  /**
   * 生成圖片
   * @param {Object} params - 生成參數
   * @param {string} params.prompt - 圖片描述提示
   * @param {string} params.aspectRatio - 圖片比例 ('1:1', '9:16', '16:9', '3:4', '4:3')
   * @param {string} params.outputFormat - 輸出格式 ('image/jpeg', 'image/png')
   * @param {number} params.seed - 隨機種子（可選）
   * @param {string} params.userId - 使用者 ID（用於記錄）
   * @returns {Promise<Object>} - 生成結果
   */
  async generateImage({ prompt, aspectRatio = '1:1', outputFormat = 'image/jpeg', seed, userId }) {
    if (!this.isAvailable()) {
      throw new Error('Google Imagen service is not available');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // 驗證參數
    const validAspectRatios = ['1:1', '9:16', '16:9', '3:4', '4:3'];
    const validFormats = ['image/jpeg', 'image/png'];

    if (!validAspectRatios.includes(aspectRatio)) {
      throw new Error(`Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}`);
    }

    if (!validFormats.includes(outputFormat)) {
      throw new Error(`Invalid output format. Must be one of: ${validFormats.join(', ')}`);
    }

    try {
      console.log(`🎨 Generating image with Google Imagen for user ${userId}:`, {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        aspectRatio,
        outputFormat
      });

      // 構建生成請求
      const generateRequest = {
        prompt: prompt,
        aspectRatio: aspectRatio,
        outputFormat: outputFormat
      };

      // 如果提供了種子，添加到請求中
      if (seed !== undefined) {
        generateRequest.seed = seed;
      }

      // 注意：Google Gemini API 目前不直接支援圖片生成
      // 這裡我們暫時返回一個錯誤，建議使用 Azure OpenAI
      throw new Error('Google Imagen is currently not available. Google Gemini API does not support direct image generation yet. Please use Azure OpenAI DALL-E instead.');

    } catch (error) {
      console.error('❌ Google Imagen generation failed:', error.message);
      
      // 處理常見錯誤
      if (error.message.includes('SAFETY')) {
        throw new Error('Content safety violation: The prompt contains content that is not allowed');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Quota exceeded: Please try again later');
      } else if (error.message.includes('INVALID_ARGUMENT')) {
        throw new Error('Invalid request: Please check your prompt and parameters');
      } else {
        throw new Error(`Image generation failed: ${error.message}`);
      }
    }
  }

  /**
   * 使用文字和圖片生成新圖片（圖片編輯功能）
   * @param {Object} params - 編輯參數
   * @param {string} params.prompt - 編輯描述
   * @param {string} params.baseImageUrl - 基礎圖片 URL
   * @param {string} params.userId - 使用者 ID
   * @returns {Promise<Object>} - 編輯結果
   */
  async editImage({ prompt, baseImageUrl, userId }) {
    if (!this.isAvailable()) {
      throw new Error('Google Imagen service is not available');
    }

    try {
      console.log(`🖼️ Editing image with Google Imagen for user ${userId}`);

      // 這裡需要根據 Google Imagen 的圖片編輯 API 實現
      // 目前作為佔位符實現
      
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              text: `Edit this image: ${prompt}`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: baseImageUrl // 這裡需要轉換為 base64
              }
            }
          ]
        }]
      });

      return {
        success: true,
        imageUrl: result.response.candidates?.[0]?.imageUrl,
        generatedAt: new Date().toISOString(),
        userId: userId,
        provider: 'google-imagen'
      };

    } catch (error) {
      console.error('❌ Google Imagen edit failed:', error.message);
      throw new Error(`Image editing failed: ${error.message}`);
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

    if (trimmedPrompt.length > 2000) {
      return { valid: false, error: 'Prompt is too long (maximum 2000 characters for Google Imagen)' };
    }

    // 基本內容過濾
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
   * 獲取支援的功能和限制
   * @returns {Object} - 功能配置
   */
  getCapabilities() {
    return {
      maxPromptLength: 2000,
      supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
      supportedFormats: ['image/jpeg', 'image/png'],
      features: {
        textToImage: true,
        imageEditing: true, // 如果 Google Imagen 支援
        styleTransfer: false, // 根據實際 API 能力調整
        inpainting: false // 根據實際 API 能力調整
      },
      pricing: {
        textToImage: 'Pay per generation',
        imageEditing: 'Pay per edit'
      }
    };
  }

  /**
   * 獲取使用統計
   * @param {string} userId - 使用者 ID
   * @returns {Object} - 使用統計
   */
  async getUsageStats(userId) {
    // 這裡可以實作使用統計功能
    return {
      userId: userId,
      provider: 'google-imagen',
      totalImages: 0,
      todayImages: 0,
      monthlyImages: 0,
      lastGenerated: null
    };
  }
}

// 創建單例實例
const googleImagenService = new GoogleImagenService();

module.exports = googleImagenService;