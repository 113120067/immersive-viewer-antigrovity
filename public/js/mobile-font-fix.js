// 手機字體動態調整解決方案 - 簡化版
(function() {
    'use strict';
    
    // 檢測是否為手機裝置
    function isMobileDevice() {
        return window.innerWidth <= 576 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 動態調整字體大小
    function adjustMobileFonts() {
        if (!isMobileDevice()) return;
        
        // 創建並插入CSS樣式
        const style = document.createElement('style');
        style.id = 'mobile-font-override';
        style.innerHTML = `
            /* 手機版適中字體 - JavaScript 注入 */
            @media screen and (max-width: 576px) {
                body {
                    font-size: 16px !important;
                    line-height: 1.4 !important;
                }
                
                #wordInput {
                    font-size: 18px !important;
                    min-height: 48px !important;
                    padding: 12px 16px !important;
                    border-width: 2px !important;
                }
                
                #generateBtn {
                    font-size: 16px !important;
                    min-height: 48px !important;
                    padding: 12px 20px !important;
                }
                
                .card-header h3 {
                    font-size: 1.5rem !important;
                }
                
                .form-check-label {
                    font-size: 14px !important;
                }
                
                .btn-sm {
                    font-size: 14px !important;
                    min-height: 40px !important;
                    padding: 8px 12px !important;
                }
                
                .alert h5 {
                    font-size: 1.3rem !important;
                }
                
                .alert p {
                    font-size: 14px !important;
                }
            }
        `;
        
        // 移除舊的樣式（如果存在）
        const oldStyle = document.getElementById('mobile-font-override');
        if (oldStyle) {
            oldStyle.remove();
        }
        
        // 插入新樣式到head
        document.head.appendChild(style);
    }
    
    // 頁面載入完成後執行一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', adjustMobileFonts);
    } else {
        adjustMobileFonts();
    }
    
    // 視窗大小改變時重新調整
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(adjustMobileFonts, 300);
    });
    
})();