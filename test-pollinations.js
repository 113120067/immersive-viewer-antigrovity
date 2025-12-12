/**
 * Test Pollinations Service
 * 測試 Pollinations 免費圖片生成服務
 */

const pollinationsService = require('./src/services/pollinations-service');

async function testPollinations() {
  console.log('🌸 Testing Pollinations Service...\n');

  try {
    // 測試服務可用性
    console.log('1. Checking service availability...');
    const isAvailable = pollinationsService.isAvailable();
    console.log(`   Available: ${isAvailable ? '✅' : '❌'}\n`);

    if (!isAvailable) {
      console.log('❌ Service not available, exiting test');
      return;
    }

    // 測試基本圖片生成
    console.log('2. Testing basic image generation...');
    const basicResult = await pollinationsService.generateImage({
      prompt: 'a cute cat playing with a ball',
      userId: 'test-user'
    });

    console.log('   Result:', {
      success: basicResult.success,
      imageUrl: basicResult.imageUrl ? 'Generated ✅' : 'Failed ❌',
      cost: basicResult.cost,
      provider: basicResult.provider
    });
    console.log('   Image URL:', basicResult.imageUrl);
    console.log('');

    // 測試兒童友善生成
    console.log('3. Testing kids-friendly generation...');
    const kidsResult = await pollinationsService.generateKidsImage({
      word: 'apple',
      userId: 'test-user'
    });

    console.log('   Result:', {
      success: kidsResult.success,
      imageUrl: kidsResult.imageUrl ? 'Generated ✅' : 'Failed ❌',
      cost: kidsResult.cost,
      provider: kidsResult.provider
    });
    console.log('   Image URL:', kidsResult.imageUrl);
    console.log('');

    // 測試自訂參數
    console.log('4. Testing custom parameters...');
    const customResult = await pollinationsService.generateImage({
      prompt: 'a beautiful landscape',
      width: 768,
      height: 768,
      model: 'flux-realism',
      seed: 12345,
      enhance: true,
      userId: 'test-user'
    });

    console.log('   Result:', {
      success: customResult.success,
      imageUrl: customResult.imageUrl ? 'Generated ✅' : 'Failed ❌',
      width: customResult.width,
      height: customResult.height,
      model: customResult.model,
      seed: customResult.seed
    });
    console.log('   Image URL:', customResult.imageUrl);
    console.log('');

    // 測試提示詞驗證
    console.log('5. Testing prompt validation...');
    const validPrompt = pollinationsService.validatePrompt('a cute dog');
    const invalidPrompt = pollinationsService.validatePrompt('');
    const longPrompt = pollinationsService.validatePrompt('a'.repeat(1001));

    console.log('   Valid prompt:', validPrompt.valid ? '✅' : '❌');
    console.log('   Empty prompt:', invalidPrompt.valid ? '❌' : '✅');
    console.log('   Long prompt:', longPrompt.valid ? '❌' : '✅');
    console.log('');

    // 測試功能配置
    console.log('6. Testing capabilities...');
    const capabilities = pollinationsService.getCapabilities();
    console.log('   Capabilities:', {
      freeToUse: capabilities.features.freeToUse,
      noApiKey: capabilities.features.noApiKey,
      unlimitedUsage: capabilities.features.unlimitedUsage,
      maxPromptLength: capabilities.maxPromptLength,
      supportedModels: capabilities.supportedModels.length
    });
    console.log('');

    // 測試使用統計
    console.log('7. Testing usage stats...');
    const stats = await pollinationsService.getUsageStats('test-user');
    console.log('   Stats:', {
      provider: stats.provider,
      totalImages: stats.totalImages,
      totalCost: stats.totalCost,
      limits: stats.limits.cost
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// 執行測試
if (require.main === module) {
  testPollinations();
}

module.exports = { testPollinations };