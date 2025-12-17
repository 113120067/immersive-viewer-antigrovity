const axios = require('axios');

async function testPollinations() {
  console.log('Testing Pollinations Text API...');

  // Method 1: Root POST with OpenAI format (My implementation)
  try {
    const res = await axios.post('https://text.pollinations.ai/', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say Hello' }
      ],
      model: 'openai'
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log('✅ Method 1 (Root JSON) Success:', res.data.substring(0, 50));
  } catch (e) {
    console.log('❌ Method 1 Failed:', e.message);
  }

  // Method 2: /openai Endpoint
  try {
    const res = await axios.post('https://text.pollinations.ai/openai', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say Hello' }
      ],
      model: 'openai'
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log('✅ Method 2 (/openai) Success:', res.data.substring(0, 50));
  } catch (e) {
    console.log('❌ Method 2 Failed:', e.message);
  }
}

testPollinations();