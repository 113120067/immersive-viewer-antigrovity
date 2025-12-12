/**
 * Test Image Generation API
 * 測試圖片生成 API 端點
 */

const http = require('http');

async function testImageGenerationAPI() {
  console.log('🧪 Testing Image Generation API...\n');

  // 測試數據
  const testData = {
    prompt: 'Create a cute, colorful cartoon illustration of "cat" that helps elementary school children learn English vocabulary.',
    provider: 'pollinations',
    width: 1024,
    height: 1024,
    model: 'flux',
    enhance: true
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/image-generator/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': 'Bearer test-token' // 這會失敗，但我們可以看到錯誤類型
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response Headers:', res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Raw Response:', data);
        }
        
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 執行測試
if (require.main === module) {
  testImageGenerationAPI()
    .then(() => console.log('\n✅ API test completed'))
    .catch(error => console.error('\n❌ API test failed:', error.message));
}

module.exports = { testImageGenerationAPI };