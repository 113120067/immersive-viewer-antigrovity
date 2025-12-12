/**
 * Vocabulary Generator Routes
 * 英文單字學習圖片生成路由
 */

const express = require('express');
const router = express.Router();
const VocabularyPromptGenerator = require('../src/utils/vocabulary-prompt-generator');

const promptGenerator = new VocabularyPromptGenerator();

/**
 * GET /vocabulary-generator - 單字學習圖片生成器頁面
 */
router.get('/', (req, res) => {
  res.render('vocabulary-generator', { 
    title: 'English Vocabulary Image Generator'
  });
});

/**
 * POST /vocabulary-generator/analyze - 分析單字並推薦策略
 */
router.post('/analyze', (req, res) => {
  try {
    const { word, definition } = req.body;
    
    if (!word || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Word is required'
      });
    }
    
    const analysis = promptGenerator.analyzeAndRecommend(word.trim(), definition || '');
    
    res.json({
      success: true,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Word analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze word'
    });
  }
});

/**
 * POST /vocabulary-generator/variations - 生成多個提示詞變體
 */
router.post('/variations', (req, res) => {
  try {
    const { word, definition, count = 3 } = req.body;
    
    if (!word || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Word is required'
      });
    }
    
    const variations = promptGenerator.generateVariations(
      word.trim(), 
      definition || '', 
      Math.min(count, 5) // 限制最多5個變體
    );
    
    res.json({
      success: true,
      variations: variations
    });
    
  } catch (error) {
    console.error('Variations generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variations'
    });
  }
});

/**
 * POST /vocabulary-generator/theme - 生成主題相關單字組合
 */
router.post('/theme', (req, res) => {
  try {
    const { words, theme, style = 'memory' } = req.body;
    
    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Words array is required'
      });
    }
    
    if (!theme || theme.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Theme is required'
      });
    }
    
    // 限制單字數量
    const limitedWords = words.slice(0, 8);
    
    const themePrompt = promptGenerator.generateThemePrompt(
      limitedWords, 
      theme.trim(), 
      style
    );
    
    res.json({
      success: true,
      themePrompt: themePrompt
    });
    
  } catch (error) {
    console.error('Theme generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate theme prompt'
    });
  }
});

/**
 * GET /vocabulary-generator/examples - 獲取範例單字
 */
router.get('/examples', (req, res) => {
  const examples = {
    beginner: [
      { word: 'apple', definition: 'a round red or green fruit', category: 'noun' },
      { word: 'cat', definition: 'a small furry pet animal', category: 'noun' },
      { word: 'run', definition: 'to move quickly on foot', category: 'verb' },
      { word: 'big', definition: 'large in size', category: 'adjective' },
      { word: 'happy', definition: 'feeling joy and pleasure', category: 'adjective' }
    ],
    intermediate: [
      { word: 'library', definition: 'a place with many books to read', category: 'noun' },
      { word: 'cooking', definition: 'preparing food by heating', category: 'verb' },
      { word: 'beautiful', definition: 'pleasing to look at', category: 'adjective' },
      { word: 'bicycle', definition: 'a vehicle with two wheels', category: 'noun' },
      { word: 'studying', definition: 'learning about a subject', category: 'verb' }
    ],
    advanced: [
      { word: 'friendship', definition: 'a close relationship between people', category: 'abstract' },
      { word: 'democracy', definition: 'government by the people', category: 'abstract' },
      { word: 'sophisticated', definition: 'complex and refined', category: 'adjective' },
      { word: 'architecture', definition: 'the design of buildings', category: 'noun' },
      { word: 'contemplating', definition: 'thinking deeply about something', category: 'verb' }
    ]
  };
  
  const themes = [
    { name: 'Animals', words: ['cat', 'dog', 'bird', 'fish', 'elephant'] },
    { name: 'Food', words: ['apple', 'bread', 'milk', 'pizza', 'salad'] },
    { name: 'School', words: ['book', 'pencil', 'teacher', 'classroom', 'homework'] },
    { name: 'Family', words: ['mother', 'father', 'sister', 'brother', 'grandmother'] },
    { name: 'Weather', words: ['sunny', 'rainy', 'cloudy', 'windy', 'snowy'] }
  ];
  
  res.json({
    success: true,
    examples: examples,
    themes: themes
  });
});

module.exports = router;