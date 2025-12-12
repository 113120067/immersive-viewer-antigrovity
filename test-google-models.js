/**
 * Google AI Models Test Script
 * 測試哪些 Google AI 模型真正可用於圖片生成
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGoogleModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GOOGLE_AI_API_KEY not found in .env file');
    return;
  }

  console.log('🔍 Testing Google AI models for image generation...\n');

  const client = new GoogleGenerativeAI(apiKey);

  // 可能的圖片生成模型列表
  const imageModels = [
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001', 
    'imagen-2.0-generate-001',
    'imagegeneration@006',
    'imagegeneration@005',
    'imagegeneration@002',
    'gemini-pro-vision', // 這個是圖片理解，不是生成
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ];

  // 測試文字生成模型（確認 API 連接正常）
  console.log('📝 Testing text generation models first...');
  
  const textModels = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  
  for (const modelName of textModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello, test message');
      console.log(`✅ ${modelName}: Working (Text generation)`);
    } catch (error) {
      console.log(`❌ ${modelName}: ${error.message}`);
    }
  }

  console.log('\n🎨 Testing image generation models...');

  // 測試圖片生成模型
  for (const modelName of imageModels) {
    try {
      console.log(`🔍 Testing ${modelName}...`);
      
      const model = client.getGenerativeModel({ model: modelName });
      
      // 嘗試不同的圖片生成方法
      const testPrompts = [
        'Generate an image of a red apple',
        'Create a simple drawing of a cat',
        { 
          contents: [{
            role: 'user',
            parts: [{ text: 'Generate an image of a red apple' }]
          }]
        }
      ];

      let success = false;
      
      for (const prompt of testPrompts) {
        try {
          const result = await model.generateContent(prompt);
          console.log(`✅ ${modelName}: Working! Response type:`, typeof result.response);
          
          if (result.response && result.response.candidates) {
            console.log(`   📊 Candidates: ${result.response.candidates.length}`);
          }
          
          success = true;
          break;
        } catch (innerError) {
          // 繼續嘗試下一個提示格式
        }
      }
      
      if (!success) {
        throw new Error('All prompt formats failed');
      }
      
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${modelName}: Model not found (404)`);
      } else if (error.message.includes('not supported')) {
        console.log(`❌ ${modelName}: Not supported for this operation`);
      } else if (error.message.includes('permission')) {
        console.log(`❌ ${modelName}: Permission denied (may need special access)`);
      } else {
        console.log(`❌ ${modelName}: ${error.message}`);
      }
    }
  }

  console.log('\n📋 Summary:');
  console.log('- Text generation models (gemini-pro, etc.) work for text only');
  console.log('- Image generation may require Google Cloud Vertex AI');
  console.log('- Some models may need special access or waitlist approval');
  console.log('\n💡 Recommendation: Use Azure OpenAI DALL-E for reliable image generation');
}

// 執行測試
if (require.main === module) {
  testGoogleModels().catch(console.error);
}

module.exports = { testGoogleModels };