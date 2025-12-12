/**
 * 英文單字學習圖片提示詞生成器
 * Vocabulary Learning Image Prompt Generator
 */

class VocabularyPromptGenerator {
  constructor() {
    // 基礎提示詞模板
    this.basePrompts = {
      // 記憶輔助風格
      memory: "Create a clear, educational illustration that helps students remember the English word '{word}'. The image should be simple, colorful, and directly represent the meaning of '{word}'. Style: educational illustration, bright colors, clean design, suitable for language learning.",
      
      // 情境學習風格
      contextual: "Create a realistic scene showing '{word}' in a natural context. The image should help students understand when and how to use this word. Include visual cues that make the meaning obvious. Style: photorealistic, natural lighting, everyday situation.",
      
      // 卡通風格
      cartoon: "Create a friendly cartoon illustration of '{word}' that will help students remember this English vocabulary. Make it fun, colorful, and memorable for language learners. Style: cartoon illustration, vibrant colors, educational, child-friendly.",
      
      // 概念圖風格
      conceptual: "Create a conceptual diagram or infographic showing '{word}' with visual elements that explain its meaning. Include simple text labels if helpful. Style: modern infographic, clean design, educational diagram.",
      
      // 故事場景風格
      story: "Create an illustration that tells a short visual story involving '{word}'. The scene should make the word's meaning memorable through narrative context. Style: storybook illustration, engaging scene, clear storytelling."
    };

    // 單字類型特定提示詞
    this.categoryPrompts = {
      noun: {
        object: "Show the {word} clearly as the main subject of the image. Make it detailed and recognizable.",
        person: "Show a {word} in action or in their typical environment/clothing.",
        place: "Show a beautiful, clear view of a {word} with distinctive features.",
        animal: "Show a {word} in its natural habitat, displaying characteristic features and behaviors.",
        food: "Show delicious-looking {word} that makes students want to remember this vocabulary."
      },
      
      verb: {
        action: "Show someone actively {word}ing. Make the action clear and dynamic.",
        movement: "Illustrate the motion of {word}ing with clear directional indicators.",
        emotion: "Show facial expressions and body language that clearly represent {word}ing."
      },
      
      adjective: {
        quality: "Show a clear contrast or comparison that demonstrates what {word} means.",
        appearance: "Show visual examples that clearly demonstrate the {word} quality.",
        feeling: "Use colors, expressions, and atmosphere to convey the {word} feeling."
      },
      
      abstract: {
        concept: "Use symbols, metaphors, and visual representations to make the abstract concept of {word} concrete and memorable."
      }
    };

    // 學習級別調整
    this.levelAdjustments = {
      beginner: "Use simple, clear imagery with minimal distractions. Focus on the most basic meaning.",
      intermediate: "Include some context and related vocabulary to expand understanding.",
      advanced: "Show nuanced meanings and usage contexts. Include subtle details that demonstrate deeper understanding."
    };

    // 記憶技巧
    this.memoryTechniques = {
      visual: "Make the image visually striking and memorable",
      association: "Include elements that create mental associations with the word",
      emotion: "Evoke positive emotions to enhance memory retention",
      story: "Create a mini-narrative that makes the word unforgettable",
      contrast: "Use contrasts and comparisons to highlight the word's meaning"
    };
  }

  /**
   * 生成單字學習提示詞
   */
  generatePrompt(options) {
    const {
      word,
      definition = '',
      category = 'general',
      subcategory = '',
      style = 'memory',
      level = 'intermediate',
      memoryTechnique = 'visual',
      includeText = false,
      culturalContext = 'international'
    } = options;

    // 基礎提示詞
    let prompt = this.basePrompts[style] || this.basePrompts.memory;
    prompt = prompt.replace(/{word}/g, word);

    // 添加類別特定指導
    if (this.categoryPrompts[category] && this.categoryPrompts[category][subcategory]) {
      const categoryPrompt = this.categoryPrompts[category][subcategory].replace(/{word}/g, word);
      prompt += ` ${categoryPrompt}`;
    }

    // 添加定義輔助
    if (definition) {
      prompt += ` The word means: ${definition}. Make sure the image clearly represents this meaning.`;
    }

    // 添加級別調整
    if (this.levelAdjustments[level]) {
      prompt += ` ${this.levelAdjustments[level]}`;
    }

    // 添加記憶技巧
    if (this.memoryTechniques[memoryTechnique]) {
      prompt += ` ${this.memoryTechniques[memoryTechnique]}.`;
    }

    // 文字標籤選項
    if (includeText) {
      prompt += ` Include the word "${word}" as a clear, readable label in the image.`;
    }

    // 文化背景調整
    if (culturalContext !== 'international') {
      prompt += ` Use ${culturalContext} cultural context and visual references.`;
    }

    // 通用質量要求
    prompt += " High quality, educational, suitable for language learning, clear and unambiguous meaning.";

    return {
      prompt: prompt,
      word: word,
      metadata: {
        category,
        subcategory,
        style,
        level,
        memoryTechnique,
        includeText,
        culturalContext
      }
    };
  }

  /**
   * 為特定單字類型生成多個變體提示詞
   */
  generateVariations(word, definition = '', count = 3) {
    const styles = ['memory', 'contextual', 'cartoon'];
    const techniques = ['visual', 'association', 'emotion'];
    
    const variations = [];
    
    for (let i = 0; i < count && i < styles.length; i++) {
      const variation = this.generatePrompt({
        word,
        definition,
        style: styles[i],
        memoryTechnique: techniques[i] || 'visual'
      });
      
      variations.push({
        ...variation,
        title: `${word} - ${styles[i]} style`,
        description: `${styles[i]} approach for learning "${word}"`
      });
    }
    
    return variations;
  }

  /**
   * 智能分析單字並推薦最佳提示詞策略
   */
  analyzeAndRecommend(word, definition = '') {
    const analysis = {
      word,
      definition,
      recommendations: {}
    };

    // 簡單的單字類型分析
    const wordLower = word.toLowerCase();
    
    // 動詞檢測
    if (wordLower.endsWith('ing') || wordLower.endsWith('ed') || 
        ['run', 'jump', 'eat', 'sleep', 'walk', 'talk', 'read', 'write'].includes(wordLower)) {
      analysis.recommendations.category = 'verb';
      analysis.recommendations.subcategory = 'action';
      analysis.recommendations.style = 'contextual';
    }
    // 形容詞檢測
    else if (definition.includes('adjective') || 
             ['big', 'small', 'happy', 'sad', 'beautiful', 'ugly', 'fast', 'slow'].includes(wordLower)) {
      analysis.recommendations.category = 'adjective';
      analysis.recommendations.subcategory = 'quality';
      analysis.recommendations.style = 'memory';
    }
    // 名詞檢測
    else {
      analysis.recommendations.category = 'noun';
      analysis.recommendations.subcategory = 'object';
      analysis.recommendations.style = 'memory';
    }

    // 生成推薦的提示詞
    analysis.recommendedPrompt = this.generatePrompt({
      word,
      definition,
      ...analysis.recommendations
    });

    return analysis;
  }

  /**
   * 生成主題相關的單字組合提示詞
   */
  generateThemePrompt(words, theme, style = 'memory') {
    const wordList = words.join(', ');
    
    let prompt = `Create an educational illustration showing multiple English vocabulary words related to ${theme}. `;
    prompt += `Include clear representations of: ${wordList}. `;
    prompt += `Each item should be clearly identifiable and labeled. `;
    prompt += `Style: ${style === 'memory' ? 'educational poster' : style}, `;
    prompt += `bright colors, organized layout, perfect for vocabulary learning. `;
    prompt += `Theme: ${theme}. High quality, educational, clear labels.`;

    return {
      prompt,
      words,
      theme,
      type: 'theme-collection'
    };
  }
}

module.exports = VocabularyPromptGenerator;