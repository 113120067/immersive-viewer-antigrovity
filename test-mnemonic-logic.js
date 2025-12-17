const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PROMPT_PATH = path.join(__dirname, 'docs', 'prompt');
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf-8');

async function testWord(word) {
    console.log(`\n\n=== Testing Word: ${word} ===`);
    try {
        const res = await axios.post('http://localhost:3000/mnemonic/generate-architect', {
            word: word,
            systemPrompt: SYSTEM_PROMPT,
            apiKey: '', // Optional
            baseUrl: '' // Optional
        });

        if (res.data.success) {
            console.log('✅ Success!');
            console.log('Analysis:', JSON.stringify(res.data.analysis, null, 2));
            console.log('Image Prompt:', res.data.image_prompt);
        } else {
            console.error('❌ Failed:', res.data.error);
        }
    } catch (e) {
        console.error('❌ Request Error:', e.message);
    }
}

async function runTests() {
    // 1. Type A: Standard Etymology
    await testWord('Construction');

    // 2. Type B: Creative Puzzle Split (The one we fixed)
    await testWord('Barbecue');

    // 3. Type C: Simplex
    await testWord('Cat');
}

runTests();
