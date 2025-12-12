/**
 * Usage Statistics Routes
 * 使用量統計和管理路由
 */

const express = require('express');
const router = express.Router();
const { verifyIdToken } = require('../src/middleware/auth-middleware');
const usageLimiter = require('../src/services/usage-limiter');

/**
 * GET /usage-stats - 使用統計頁面
 */
router.get('/', (req, res) => {
  res.render('usage-stats', { 
    title: '使用量統計與限制管理'
  });
});

/**
 * GET /usage-stats/report - 獲取使用統計報告
 */
router.get('/report', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    const userId = req.user.uid;
    const report = await usageLimiter.getUsageReport(userId);
    
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Usage report error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate usage report'
    });
  }
});

/**
 * GET /usage-stats/global - 獲取全系統統計（管理員用）
 */
router.get('/global', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    // 這裡可以添加管理員權限檢查
    const report = await usageLimiter.getUsageReport();
    
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('Global usage report error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate global usage report'
    });
  }
});

/**
 * GET /usage-stats/check - 檢查當前用戶是否可以生成圖片
 */
router.get('/check', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    const userId = req.user.uid;
    const { size = '1024x1024', quality = 'standard' } = req.query;
    
    const limitCheck = await usageLimiter.checkUserLimit(userId, size, quality);
    
    res.json({
      success: true,
      check: limitCheck
    });
  } catch (error) {
    console.error('Limit check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check usage limits'
    });
  }
});

/**
 * POST /usage-stats/simulate - 模擬使用量記錄（測試用）
 */
router.post('/simulate', verifyIdToken({ optional: false }), async (req, res) => {
  try {
    const userId = req.user.uid;
    const { size = '1024x1024', quality = 'standard', count = 1 } = req.body;
    
    // 只在開發環境允許模擬
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Simulation not allowed in production'
      });
    }
    
    // 模擬多次使用
    for (let i = 0; i < count; i++) {
      await usageLimiter.recordUsage(userId, size, quality, true);
    }
    
    res.json({
      success: true,
      message: `Simulated ${count} image generations`
    });
  } catch (error) {
    console.error('Simulation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate usage'
    });
  }
});

module.exports = router;