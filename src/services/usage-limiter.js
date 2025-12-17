/**
 * Usage Limiter Service
 * 控制 Azure AI 圖片生成的使用量和費用
 */

const { db, admin } = require('../config/firebase-admin');

class UsageLimiter {
  constructor() {
    this.db = db;
    // If db is null, we can't do much, but we shouldn't crash.

    // 使用限制配置
    this.limits = {
      // 每日限制
      dailyLimits: {
        perUser: parseInt(process.env.DAILY_LIMIT_PER_USER) || 10,      // 每用戶每日10張
        global: parseInt(process.env.DAILY_LIMIT_GLOBAL) || 100        // 全系統每日100張
      },

      // 每月限制
      monthlyLimits: {
        perUser: parseInt(process.env.MONTHLY_LIMIT_PER_USER) || 50,    // 每用戶每月50張
        global: parseInt(process.env.MONTHLY_LIMIT_GLOBAL) || 500      // 全系統每月500張
      },

      // 費用限制 (USD)
      costLimits: {
        dailyCost: parseFloat(process.env.DAILY_COST_LIMIT) || 5.0,    // 每日$5
        monthlyCost: parseFloat(process.env.MONTHLY_COST_LIMIT) || 50.0 // 每月$50
      },

      // 圖片生成成本 (USD)
      costs: {
        standard_1024x1024: 0.040,    // $0.040 per image
        standard_1792x1024: 0.080,    // $0.080 per image
        standard_1024x1792: 0.080,    // $0.080 per image
        hd_1024x1024: 0.080,          // $0.080 per image
        hd_1792x1024: 0.120,          // $0.120 per image
        hd_1024x1792: 0.120           // $0.120 per image
      }
    };
  }

  /**
   * 檢查用戶是否可以生成圖片
   * @param {string} userId - 用戶 ID
   * @param {string} size - 圖片尺寸
   * @param {string} quality - 圖片品質
   * @returns {Promise<Object>} - 檢查結果
   */
  async checkUserLimit(userId, size = '1024x1024', quality = 'standard') {
    try {
      const today = this.getDateString();
      const thisMonth = this.getMonthString();

      // 獲取用戶使用統計
      const userStats = await this.getUserStats(userId, today, thisMonth);

      // 獲取全系統使用統計
      const globalStats = await this.getGlobalStats(today, thisMonth);

      // 計算這次生成的成本
      const costKey = `${quality}_${size}`;
      const imageCost = this.limits.costs[costKey] || this.limits.costs.standard_1024x1024;

      // 檢查各種限制
      const checks = {
        userDailyCount: userStats.dailyCount < this.limits.dailyLimits.perUser,
        userMonthlyCount: userStats.monthlyCount < this.limits.monthlyLimits.perUser,
        globalDailyCount: globalStats.dailyCount < this.limits.dailyLimits.global,
        globalMonthlyCount: globalStats.monthlyCount < this.limits.monthlyLimits.global,
        dailyCost: (globalStats.dailyCost + imageCost) <= this.limits.costLimits.dailyCost,
        monthlyCost: (globalStats.monthlyCost + imageCost) <= this.limits.costLimits.monthlyCost
      };

      const canGenerate = Object.values(checks).every(check => check);

      return {
        allowed: canGenerate,
        reason: canGenerate ? null : this.getBlockReason(checks),
        userStats: userStats,
        globalStats: globalStats,
        estimatedCost: imageCost,
        limits: this.limits,
        checks: checks
      };

    } catch (error) {
      console.error('Error checking user limit:', error);
      return {
        allowed: false,
        reason: 'System error: Unable to check usage limits',
        error: error.message
      };
    }
  }

  /**
   * 記錄圖片生成使用
   * @param {string} userId - 用戶 ID
   * @param {string} size - 圖片尺寸
   * @param {string} quality - 圖片品質
   * @param {boolean} success - 是否成功生成
   * @returns {Promise<void>}
   */
  async recordUsage(userId, size, quality, success = true) {
    if (!success) return; // 只記錄成功的生成

    try {
      const today = this.getDateString();
      const thisMonth = this.getMonthString();
      const timestamp = new Date();

      // 計算成本
      const costKey = `${quality}_${size}`;
      const imageCost = this.limits.costs[costKey] || this.limits.costs.standard_1024x1024;

      // 記錄用戶使用
      await this.recordUserUsage(userId, today, thisMonth, imageCost, timestamp);

      // 記錄全系統使用
      await this.recordGlobalUsage(today, thisMonth, imageCost, timestamp);

      console.log(`📊 Usage recorded: User ${userId}, Cost $${imageCost}, ${quality} ${size}`);

    } catch (error) {
      console.error('Error recording usage:', error);
    }
  }

  /**
   * 獲取用戶使用統計
   * @param {string} userId - 用戶 ID
   * @param {string} today - 今日日期字串
   * @param {string} thisMonth - 本月字串
   * @returns {Promise<Object>} - 使用統計
   */
  async getUserStats(userId, today, thisMonth) {
    const userRef = this.db.collection('usage_stats').doc(`user_${userId}`);
    const doc = await userRef.get();

    if (!doc.exists) {
      return {
        dailyCount: 0,
        monthlyCount: 0,
        dailyCost: 0,
        monthlyCost: 0,
        lastUsed: null
      };
    }

    const data = doc.data();

    return {
      dailyCount: data.daily?.[today]?.count || 0,
      monthlyCount: data.monthly?.[thisMonth]?.count || 0,
      dailyCost: data.daily?.[today]?.cost || 0,
      monthlyCost: data.monthly?.[thisMonth]?.cost || 0,
      lastUsed: data.lastUsed
    };
  }

  /**
   * 獲取全系統使用統計
   * @param {string} today - 今日日期字串
   * @param {string} thisMonth - 本月字串
   * @returns {Promise<Object>} - 使用統計
   */
  async getGlobalStats(today, thisMonth) {
    const globalRef = this.db.collection('usage_stats').doc('global');
    const doc = await globalRef.get();

    if (!doc.exists) {
      return {
        dailyCount: 0,
        monthlyCount: 0,
        dailyCost: 0,
        monthlyCost: 0
      };
    }

    const data = doc.data();

    return {
      dailyCount: data.daily?.[today]?.count || 0,
      monthlyCount: data.monthly?.[thisMonth]?.count || 0,
      dailyCost: data.daily?.[today]?.cost || 0,
      monthlyCost: data.monthly?.[thisMonth]?.cost || 0
    };
  }

  /**
   * 記錄用戶使用
   */
  async recordUserUsage(userId, today, thisMonth, cost, timestamp) {
    const userRef = this.db.collection('usage_stats').doc(`user_${userId}`);

    await userRef.set({
      [`daily.${today}.count`]: admin.firestore.FieldValue.increment(1),
      [`daily.${today}.cost`]: admin.firestore.FieldValue.increment(cost),
      [`monthly.${thisMonth}.count`]: admin.firestore.FieldValue.increment(1),
      [`monthly.${thisMonth}.cost`]: admin.firestore.FieldValue.increment(cost),
      lastUsed: timestamp,
      userId: userId
    }, { merge: true });
  }

  /**
   * 記錄全系統使用
   */
  async recordGlobalUsage(today, thisMonth, cost, timestamp) {
    const globalRef = this.db.collection('usage_stats').doc('global');

    await globalRef.set({
      [`daily.${today}.count`]: admin.firestore.FieldValue.increment(1),
      [`daily.${today}.cost`]: admin.firestore.FieldValue.increment(cost),
      [`monthly.${thisMonth}.count`]: admin.firestore.FieldValue.increment(1),
      [`monthly.${thisMonth}.cost`]: admin.firestore.FieldValue.increment(cost),
      lastUpdated: timestamp
    }, { merge: true });
  }

  /**
   * 獲取阻擋原因
   */
  getBlockReason(checks) {
    if (!checks.userDailyCount) {
      return `已達到每日個人限制 (${this.limits.dailyLimits.perUser} 張圖片)`;
    }
    if (!checks.userMonthlyCount) {
      return `已達到每月個人限制 (${this.limits.monthlyLimits.perUser} 張圖片)`;
    }
    if (!checks.globalDailyCount) {
      return `系統已達到每日限制 (${this.limits.dailyLimits.global} 張圖片)`;
    }
    if (!checks.globalMonthlyCount) {
      return `系統已達到每月限制 (${this.limits.monthlyLimits.global} 張圖片)`;
    }
    if (!checks.dailyCost) {
      return `已達到每日費用限制 ($${this.limits.costLimits.dailyCost})`;
    }
    if (!checks.monthlyCost) {
      return `已達到每月費用限制 ($${this.limits.costLimits.monthlyCost})`;
    }
    return '未知限制';
  }

  /**
   * 獲取日期字串 (YYYY-MM-DD)
   */
  getDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  /**
   * 獲取月份字串 (YYYY-MM)
   */
  getMonthString(date = new Date()) {
    return date.toISOString().substring(0, 7);
  }

  /**
   * 獲取使用統計報告
   * @param {string} userId - 用戶 ID (可選)
   * @returns {Promise<Object>} - 統計報告
   */
  async getUsageReport(userId = null) {
    try {
      const today = this.getDateString();
      const thisMonth = this.getMonthString();

      const report = {
        date: today,
        month: thisMonth,
        limits: this.limits,
        global: await this.getGlobalStats(today, thisMonth)
      };

      if (userId) {
        report.user = await this.getUserStats(userId, today, thisMonth);
      }

      return report;
    } catch (error) {
      console.error('Error generating usage report:', error);
      throw error;
    }
  }

  /**
   * 重置每日統計 (可用於測試或手動重置)
   * @param {string} date - 日期字串 (可選)
   */
  async resetDailyStats(date = null) {
    const targetDate = date || this.getDateString();

    try {
      // 這裡可以實作重置邏輯，但要小心使用
      console.log(`⚠️ Reset daily stats for ${targetDate} - Use with caution!`);
    } catch (error) {
      console.error('Error resetting daily stats:', error);
      throw error;
    }
  }
}

// 創建單例實例
const usageLimiter = new UsageLimiter();

module.exports = usageLimiter;