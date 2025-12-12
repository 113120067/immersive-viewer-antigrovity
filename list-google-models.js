/**
 * List Available Google AI Models
 * 列出所有可用的 Google AI 模型
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listAvailableModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GOOGLE_AI_API_KEY not found in .env file');
    return;
  }

  console.log('📋 Listing all available Google AI models...\n');

  const client = new GoogleGenerativeAI(apiKey);

  try {
    // 直接測試已知的模型名稱
    const knownModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro',
      'gemini-pro-vision',
      'text-bison-001',
      'chat-bison-001'
    ];
    
    console.log('🔍 Testing known models...\n');
    
    const workingModels = [];
    
    for (const modelName of knownModels) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        
        console.log(`✅ ${modelName}: Working`);
        workingModels.push({
          name: modelName,
          status: 'working'
        });
      } catch (error) {
        console.log(`❌ ${modelName}: ${error.message.split('\n')[0]}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Working models: ${workingModels.length}`);
    
    if (workingModels.length > 0) {
      console.log('\n📝 Available text generation models:');
      workingModels.forEach(model => {
        console.log(`- ${model.name}`);
      });
      
      console.log('\n💡 Recommended for your project:');
      if (workingModels.some(m => m.name === 'gemini-1.5-flash')) {
        console.log('✅ Use: gemini-1.5-flash (fastest, good quality)');
      } else if (workingModels.some(m => m.name === 'gemini-1.5-pro')) {
        console.log('✅ Use: gemini-1.5-pro (high quality)');
      } else if (workingModels.some(m => m.name === 'gemini-pro')) {
        console.log('✅ Use: gemini-pro (standard)');
      }
    }
    
    console.log('\n🚨 Important: None of these models support IMAGE GENERATION');
    console.log('📸 For image generation, you need:');
    console.log('   - Google Cloud Vertex AI (paid service)');
    console.log('   - Or continue using Azure OpenAI DALL-E');
    console.log('   - Or try Hugging Face Stable Diffusion (free)');

  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if GOOGLE_AI_API_KEY is correct');
      console.log('2. Verify API key has proper permissions');
      console.log('3. Check if API key is activated');
    }
  }
}

// 執行
if (require.main === module) {
  listAvailableModels().catch(console.error);
}

module.exports = { listAvailableModels };