/**
 * Pollinations Service
 * 提供免費的 AI 圖片生成功能
 */

const https = require('https');
const http = require('http');

class PollinationsService {
  constructor() {
    this.baseUrl = 'https://image.pollinations.ai/prompt';
    this.initialized = true; // 無需初始化，直接可用
    
    console.log('✅ Pollinations service initialized (Free AI Image Generation)');
  }

  /**
   * 檢查服務是否可用
   */
  isAvailable() {
    return this.initialized;
  }

  /**
   * 生成圖片
   * @param {Object} params - 生成參數
   * @param {string} params.prompt - 圖片描述提示
   * @param {number} params.width - 圖片寬度 (預設 1024)
   * @param {number} params.height - 圖片高度 (預設 1024)
   * @param {number} params.seed - 隨機種子 (可選)
   * @param {string} params.model - AI 模型 (預設 'flux')
   * @param {boolean} params.enhance - 提示詞增強 (預設 true)
   * @param {string} params.userId - 使用者 ID（用於記錄）
   * @returns {Promise<Object>} - 生成結果
   */
  async generateImage({ 
    prompt, 
    width = 1024, 
    height = 1024, 
    seed = null, 
    model = 'flux', 
    enhance = true, 
    userId 
  }) {
    if (!this.isAvailable()) {
      throw new Error('Pollinations service is not available');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    try {
      console.log(`🌸 Generating image with Pollinations for user ${userId}:`, {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        width,
        height,
        model
      });

      // 構建 URL
      const encodedPrompt = encodeURIComponent(prompt.trim());
      let imageUrl = `${this.baseUrl}/${encodedPrompt}`;
      
      // 添加參數
      const params = new URLSearchParams();
      if (width !== 1024) params.append('width', width.toString());
      if (height !== 1024) params.append('height', height.toString());
      if (seed !== null) params.append('seed', seed.toString());
      if (model !== 'flux') params.append('model', model);
      if (!enhance) params.append('enhance', 'false');
      
      if (params.toString()) {
        imageUrl += '?' + params.toString();
      }

      // Pollinations 圖片是即時生成的，直接返回 URL
      // 不進行驗證，因為圖片可能需要時間生成
      console.log('🌸 Pollinations URL generated, skipping validation for better performance');

      console.log('✅ Pollinations image generated successfully');

      return {
        success: true,
        imageUrl: imageUrl,
        revisedPrompt: prompt, // Pollinations 不修改提示詞
        width: width,
        height: height,
        model: model,
        seed: seed,
        generatedAt: new Date().toISOString(),
        userId: userId,
        provider: 'pollinations',
        cost: 0, // 完全免費
        usageInfo: {
          cost: 0,
          free: true
        }
      };

    } catch (error) {
      console.error('❌ Pollinations image generation failed:', error.message);
      
      // 處理常見錯誤
      if (error.message.includes('timeout')) {
        throw new Error('Image generation timeout: Please try again later');
      } else if (error.message.includes('network')) {
        throw new Error('Network error: Please check your internet connection');
      } else {
        throw new Error(`Pollinations generation failed: ${error.message}`);
      }
    }
  }

  /**
   * 驗證圖片 URL 是否可訪問
   * @param {string} url - 圖片 URL
   * @returns {Promise<boolean>} - 是否可訪問
   */
  async validateImageUrl(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https:') ? https : http;
      
      const request = protocol.request(url, { method: 'HEAD', timeout: 15000 }, (response) => {
        const isValid = response.statusCode === 200 && response.headers['content-type']?.startsWith('image/');
        console.log(`🔍 Image validation: ${response.statusCode}, Content-Type: ${response.headers['content-type']}, Valid: ${isValid}`);
        resolve(isValid);
      });
      
      request.on('error', (error) => {
        console.log(`🔍 Image validation error: ${error.message}`);
        resolve(false);
      });
      
      request.on('timeout', () => {
        console.log('🔍 Image validation timeout');
        request.destroy();
        resolve(false);
      });
      
      request.end();
    });
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

    // Pollinations 對提示詞長度較寬鬆
    if (trimmedPrompt.length > 1000) {
      return { valid: false, error: 'Prompt is too long (maximum 1000 characters)' };
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
      maxPromptLength: 1000,
      supportedSizes: ['512x512', '768x768', '1024x1024', '1024x1792', '1792x1024'],
      supportedModels: ['flux', 'flux-realism', 'flux-cablyai', 'flux-anime', 'flux-3d'],
      features: {
        textToImage: true,
        imageEditing: false,
        styleTransfer: true,
        inpainting: false,
        freeToUse: true,
        noApiKey: true,
        unlimitedUsage: true
      },
      pricing: {
        textToImage: 'Free',
        cost: '$0.00 per image'
      }
    };
  }

  /**
   * 獲取使用統計（免費服務，無需追蹤）
   * @param {string} userId - 使用者 ID
   * @returns {Object} - 使用統計
   */
  async getUsageStats(userId) {
    return {
      userId: userId,
      provider: 'pollinations',
      totalImages: 'unlimited',
      todayImages: 'unlimited',
      monthlyImages: 'unlimited',
      totalCost: 0,
      todayCost: 0,
      monthlyCost: 0,
      lastGenerated: null,
      limits: {
        daily: 'unlimited',
        monthly: 'unlimited',
        cost: 'free'
      }
    };
  }

  /**
   * 生成兒童友善的圖片（Kids Vocabulary 專用）
   * @param {Object} params - 生成參數
   * @param {string} params.word - 英文單字
   * @param {string} params.userId - 使用者 ID
   * @returns {Promise<Object>} - 生成結果
   */
  async generateKidsImage({ word, userId }) {
    // 使用最簡單的提示詞，確保可靠性
    const kidsPrompt = `cute cartoon ${word}`;

    return await this.generateImage({
      prompt: kidsPrompt,
      width: 1024,
      height: 1024,
      model: 'flux', // 使用預設模型
      enhance: true,
      userId: userId
    });
  }

  /**
   * 批量生成圖片（如果需要）
   * @param {Array} prompts - 提示詞陣列
   * @param {string} userId - 使用者 ID
   * @returns {Promise<Array>} - 生成結果陣列
   */
  async generateMultipleImages(prompts, userId) {
    const results = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.generateImage({ prompt, userId });
        results.push(result);
        
        // 避免過於頻繁的請求
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          prompt: prompt
        });
      }
    }
    
    return results;
  }
}

// 創建單例實例
const pollinationsService = new PollinationsService();

module.exports = pollinationsService;