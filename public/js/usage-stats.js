/**
 * Usage Statistics Frontend
 * 使用量統計前端功能
 */

import { initialize, onAuthStateChanged } from '/firebase-client.js';

class UsageStatsManager {
  constructor() {
    this.currentUser = null;
    this.statsData = null;
    
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
          this.showLoginRequired();
          return;
        }
        
        this.loadStats();
      });
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('系統初始化失敗');
    }
  }

  /**
   * 顯示需要登入的提示
   */
  showLoginRequired() {
    // 隱藏載入狀態
    document.getElementById('loadingStats').classList.add('d-none');
    
    // 顯示登入提示
    const container = document.querySelector('.container');
    const loginPrompt = document.createElement('div');
    loginPrompt.className = 'row justify-content-center mt-5';
    loginPrompt.innerHTML = `
      <div class="col-md-6">
        <div class="card border-warning shadow">
          <div class="card-header bg-warning text-dark text-center">
            <h4 class="mb-0">
              <i class="fas fa-sign-in-alt me-2"></i>
              需要登入
            </h4>
          </div>
          <div class="card-body text-center">
            <div class="mb-4">
              <i class="fas fa-chart-bar fa-4x text-muted mb-3"></i>
              <h5>查看使用統計需要登入</h5>
              <p class="text-muted">
                登入後您可以查看：
              </p>
              <ul class="list-unstyled text-start">
                <li><i class="fas fa-check text-success me-2"></i>個人圖片生成統計</li>
                <li><i class="fas fa-check text-success me-2"></i>每日和每月使用量</li>
                <li><i class="fas fa-check text-success me-2"></i>費用追蹤和限制狀態</li>
                <li><i class="fas fa-check text-success me-2"></i>全系統使用狀況</li>
              </ul>
            </div>
            
            <div class="d-grid gap-2">
              <a href="/login.html" class="btn btn-primary btn-lg">
                <i class="fas fa-sign-in-alt me-2"></i>
                前往登入
              </a>
              <a href="/" class="btn btn-outline-secondary">
                <i class="fas fa-home me-2"></i>
                返回首頁
              </a>
            </div>
            
            <div class="mt-4 p-3 bg-light rounded">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                <strong>提示：</strong>Kids Vocabulary 功能現在完全免費，無需擔心使用限制！
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(loginPrompt);
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 模擬按鈕
    const simulateBtn = document.getElementById('simulateBtn');
    const simulate5Btn = document.getElementById('simulate5Btn');
    
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => this.simulateUsage(1));
    }
    
    if (simulate5Btn) {
      simulate5Btn.addEventListener('click', () => this.simulateUsage(5));
    }
    
    // 定期更新統計
    setInterval(() => {
      if (this.currentUser) {
        this.loadStats();
      }
    }, 30000); // 每30秒更新一次
  }

  /**
   * 載入使用統計
   */
  async loadStats() {
    try {
      const token = await this.getAuthToken();
      
      // 載入個人統計
      const response = await fetch('/usage-stats/report', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.statsData = data.report;
        this.displayStats();
        
        // 載入全系統統計
        this.loadGlobalStats();
      } else {
        this.showError('載入統計失敗: ' + data.error);
      }
      
    } catch (error) {
      console.error('Load stats error:', error);
      this.showError('載入統計時發生錯誤');
    }
  }

  /**
   * 載入全系統統計
   */
  async loadGlobalStats() {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch('/usage-stats/global', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayGlobalStats(data.report);
      }
      
    } catch (error) {
      console.error('Load global stats error:', error);
    }
  }

  /**
   * 顯示統計資料
   */
  displayStats() {
    const stats = this.statsData;
    
    // 隱藏載入狀態
    document.getElementById('loadingStats').classList.add('d-none');
    document.getElementById('statsContent').classList.remove('d-none');
    
    // 用戶統計
    const userStats = stats.user || {};
    const limits = stats.limits || {};
    
    // 今日統計
    const todayCount = userStats.dailyCount || 0;
    const todayLimit = limits.dailyLimits?.perUser || 0;
    const todayCost = userStats.dailyCost || 0;
    const todayCostLimit = limits.costLimits?.dailyCost || 0;
    
    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('todayLimit').textContent = todayLimit;
    document.getElementById('todayCost').textContent = '$' + todayCost.toFixed(2);
    document.getElementById('todayCostLimit').textContent = todayCostLimit.toFixed(2);
    
    // 今日進度條
    const todayProgress = todayLimit > 0 ? (todayCount / todayLimit) * 100 : 0;
    const todayCostProgress = todayCostLimit > 0 ? (todayCost / todayCostLimit) * 100 : 0;
    
    document.getElementById('todayProgress').style.width = Math.min(todayProgress, 100) + '%';
    document.getElementById('todayCostProgress').style.width = Math.min(todayCostProgress, 100) + '%';
    
    // 本月統計
    const monthlyCount = userStats.monthlyCount || 0;
    const monthlyLimit = limits.monthlyLimits?.perUser || 0;
    const monthlyCost = userStats.monthlyCost || 0;
    const monthlyCostLimit = limits.costLimits?.monthlyCost || 0;
    
    document.getElementById('monthlyCount').textContent = monthlyCount;
    document.getElementById('monthlyLimit').textContent = monthlyLimit;
    document.getElementById('monthlyCost').textContent = '$' + monthlyCost.toFixed(2);
    document.getElementById('monthlyCostLimit').textContent = monthlyCostLimit.toFixed(2);
    
    // 本月進度條
    const monthlyProgress = monthlyLimit > 0 ? (monthlyCount / monthlyLimit) * 100 : 0;
    const monthlyCostProgress = monthlyCostLimit > 0 ? (monthlyCost / monthlyCostLimit) * 100 : 0;
    
    document.getElementById('monthlyProgress').style.width = Math.min(monthlyProgress, 100) + '%';
    document.getElementById('monthlyCostProgress').style.width = Math.min(monthlyCostProgress, 100) + '%';
    
    // 限制設定顯示
    document.getElementById('dailyUserLimit').textContent = limits.dailyLimits?.perUser || 0;
    document.getElementById('dailyGlobalLimit').textContent = limits.dailyLimits?.global || 0;
    document.getElementById('dailyCostLimitDisplay').textContent = (limits.costLimits?.dailyCost || 0).toFixed(2);
    
    document.getElementById('monthlyUserLimit').textContent = limits.monthlyLimits?.perUser || 0;
    document.getElementById('monthlyGlobalLimit').textContent = limits.monthlyLimits?.global || 0;
    document.getElementById('monthlyCostLimitDisplay').textContent = (limits.costLimits?.monthlyCost || 0).toFixed(2);
    
    // 使用狀態警告
    this.updateUsageAlert(todayProgress, monthlyProgress, todayCostProgress, monthlyCostProgress);
    
    // 顯示測試功能（僅開發環境）
    if (window.location.hostname === 'localhost') {
      document.getElementById('testCard').classList.remove('d-none');
    }
  }

  /**
   * 顯示全系統統計
   */
  displayGlobalStats(globalStats) {
    document.getElementById('globalStatsContent').classList.remove('d-none');
    
    const global = globalStats.global || {};
    
    document.getElementById('globalTodayCount').textContent = global.dailyCount || 0;
    document.getElementById('globalTodayCost').textContent = (global.dailyCost || 0).toFixed(2);
    document.getElementById('globalMonthlyCount').textContent = global.monthlyCount || 0;
    document.getElementById('globalMonthlyCost').textContent = (global.monthlyCost || 0).toFixed(2);
  }

  /**
   * 更新使用狀態警告
   */
  updateUsageAlert(todayProgress, monthlyProgress, todayCostProgress, monthlyCostProgress) {
    const alertElement = document.getElementById('usageAlert');
    const messageElement = document.getElementById('usageMessage');
    
    let alertClass = 'alert-info';
    let message = '使用量正常';
    
    if (todayProgress >= 100 || monthlyProgress >= 100 || todayCostProgress >= 100 || monthlyCostProgress >= 100) {
      alertClass = 'alert-danger';
      message = '⚠️ 已達到使用限制，無法生成更多圖片';
    } else if (todayProgress >= 80 || monthlyProgress >= 80 || todayCostProgress >= 80 || monthlyCostProgress >= 80) {
      alertClass = 'alert-warning';
      message = '⚠️ 接近使用限制，請注意控制使用量';
    } else if (todayProgress >= 50 || monthlyProgress >= 50 || todayCostProgress >= 50 || monthlyCostProgress >= 50) {
      alertClass = 'alert-info';
      message = 'ℹ️ 使用量已達一半，請適度使用';
    }
    
    alertElement.className = `alert ${alertClass}`;
    messageElement.textContent = message;
    alertElement.classList.remove('d-none');
  }

  /**
   * 模擬使用量（測試用）
   */
  async simulateUsage(count) {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch('/usage-stats/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          count: count,
          size: '1024x1024',
          quality: 'standard'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 重新載入統計
        setTimeout(() => {
          this.loadStats();
        }, 1000);
        
        this.showSuccess(`模擬生成 ${count} 張圖片成功`);
      } else {
        this.showError('模擬失敗: ' + data.error);
      }
      
    } catch (error) {
      console.error('Simulate error:', error);
      this.showError('模擬時發生錯誤');
    }
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 3000);
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
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
let usageStatsManager;
document.addEventListener('DOMContentLoaded', () => {
  usageStatsManager = new UsageStatsManager();
  
  // 全域函數供 HTML 調用
  window.usageStatsManager = usageStatsManager;
});

export default UsageStatsManager;