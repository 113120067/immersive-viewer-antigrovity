const fs = require('fs');
const path = require('path');
const llmService = require('./src/services/llm-service');
require('dotenv').config();

const PROMPT_PATH = path.join(__dirname, 'docs/prompt');
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf-8');

const WORDS_TO_TEST = ['Candidate', 'Museum'];

const results = [];

async function runTest() {
    console.log('--- Starting Splitting Strategy Evaluation ---');
    console.log(`Loaded System Prompt from: ${PROMPT_PATH}\n`);

    for (const word of WORDS_TO_TEST) {
        console.log(`\nTesting Word: [ ${word} ]`);
        try {
            // Mocking the request to llmService
            // Note: We need to make sure llmService can run in this detached script context
            // If it relies on app state, might need adjustments.
            // Assuming llmService.generatePrompt uses standard OpenAI/Pollinations API calls.

            const result = await llmService.generatePrompt(SYSTEM_PROMPT, word, {
                // Using default env vars if available, or allow service to fallback
                apiKey: process.env.OPENAI_API_KEY,
                baseUrl: process.env.LLM_API_BASE_URL
            });

            let analysis = result;
            if (typeof result === 'string') {
                // Try to parse if it's a string
                try {
                    // Clean markdown if present
                    let cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
                    analysis = JSON.parse(cleanJson);
                } catch (e) {
                    analysis = { error: 'Parse Failed', raw: result };
                }
            }

            results.push({ word, analysis });

        } catch (error) {
            results.push({ word, error: error.message });
        }
    }

    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
    console.log('Results written to test_results.json');
}

runTest();
