/**
 * Image Generator Routes
 * Azure OpenAI DALL-E 圖片生成 API
 */

const express = require('express');
const router = express.Router();
const { verifyIdToken } = require('../src/middleware/auth-middleware');
const imageGenerationManager = require('../src/services/image-generation-manager');

/**
 * GET /image-generator - 圖片生成器頁面（客戶端認證）
 */
router.get('/', (req, res) => {
  res.render('image-generator', { 
    title: 'AI Image Generator - DALL-E'
  });
});

/**
 * GET /image-generator/test - 測試頁面（不需要登入）
 */
router.get('/test', (req, res) => {
  res.render('image-generator-test', { 
    title: 'Image Generator - Debug Mode'
  });
});

/**
 * GET /image-generator/status - 系統狀態頁面
 */
router.get('/status', (req, res) => {
  res.render('system-status', { 
    title: 'System Status & Provider Information'
  });
});

/**
 * POST /image-generator/generate - 生成圖片 API（需要登入）
 */
router.post('/generate', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    const { prompt, provider, size, quality, style, aspectRatio, outputFormat, seed } = req.body;
    const userId = req.user.uid;

    // 檢查是否有可用的提供商
    const availableProviders = imageGenerationManager.getAvailableProviders();
    if (availableProviders.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No image generation services are available. Please check server configuration.'
      });
    }

    // 驗證提示詞
    const validation = imageGenerationManager.validatePrompt(prompt);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // 準備選項參數
    const options = {};
    
    // Azure OpenAI 參數
    if (size) options.size = size;
    if (quality) options.quality = quality;
    if (style) options.style = style;
    
    // Google Imagen 參數
    if (aspectRatio) options.aspectRatio = aspectRatio;
    if (outputFormat) options.outputFormat = outputFormat;
    if (seed !== undefined) options.seed = seed;

    // 生成圖片
    const result = await imageGenerationManager.generateImage({
      prompt: validation.prompt,
      provider: provider,
      options: options,
      userId: userId
    });

    res.json(result);

  } catch (error) {
    console.error('Image generation error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /image-generator/usage - 獲取使用統計（需要登入）
 */
router.get('/usage', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    const userId = req.user.uid;
    const stats = await imageGenerationManager.getUsageStats(userId);
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Usage stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

/**
 * GET /image-generator/config - 獲取配置資訊
 */
router.get('/config', verifyIdToken({ optional: false }), (req, res) => {
  try {
    const systemConfig = imageGenerationManager.getSystemConfig();
    
    res.json({
      success: true,
      config: {
        ...systemConfig,
        // Azure OpenAI 選項
        azureOptions: {
          sizes: ['1024x1024', '1792x1024', '1024x1792'],
          qualities: ['standard', 'hd'],
          styles: ['vivid', 'natural']
        },
        // Google Imagen 選項
        googleOptions: {
          aspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
          outputFormats: ['image/jpeg', 'image/png']
        },
        maxPromptLength: 2000 // 使用最嚴格的限制
      }
    });
  } catch (error) {
    console.error('Config error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

module.exports = router;