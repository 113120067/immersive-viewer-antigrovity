const axios = require('axios');

class LlmService {
    constructor() {
        // Default to Pollinations Text API which is free and OpenAI-compatible-ish
        this.defaultBaseUrl = 'https://text.pollinations.ai/';
        this.defaultModel = 'openai'; // Pollinations often mirrors openai format
    }

    /**
     * Generate text using an LLM.
     * @param {string} systemPrompt - The instruction for the AI.
     * @param {string} userMessage - The user's input (word).
     * @param {object} config - Optional config (apiKey, baseUrl).
     */
    async generatePrompt(systemPrompt, userMessage, config = {}) {
        const baseUrl = config.baseUrl || this.defaultBaseUrl;
        // Fallback to Env Var if no key provided in config
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';

        // Pollinations Text API specific behavior:
        // It often accepts simple GET/POST. For structured "System + User", we construct a prompt.

        // If the user provides a legitimate OpenAI Key, we use standard OpenAI format.
        // If using Pollinations (no key), we might need to format it as a single string if their chat endpoint isn't fully strict.

        try {
            // Strategy: Try standard OpenAI Chat Completion format first.
            // Pollinations text endpoint usually accepts: POST / with JSON body { messages: [...] }

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            // If using Pollinations (default), we might need to be careful with the URL.
            // Current Pollinations Text API logic: `https://text.pollinations.ai/` 
            // It treats the path or body as the prompt. 
            // Let's try to construct a combined prompt for Pollinations if no custom base URL is passed.

            if (baseUrl.includes('pollinations.ai')) {
                // Pollinations Text optimized: Just send the raw prompt text combined.
                // It's a simple model, so strict chat structure might need to be flattened or sent as JSON.
                // Let's try sending JSON messages, usually supported.

                const response = await axios.post(baseUrl, {
                    messages: messages,
                    model: 'openai', // Hints to use a smart model
                    json: false // We want raw text back usually? Or JSON? Pollinations defaults to text.
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                return response.data;
            } else {
                // Standard OpenAI Compatible
                const response = await axios.post(`${baseUrl}/chat/completions`, {
                    model: config.model || 'gpt-3.5-turbo',
                    messages: messages,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                return response.data.choices[0].message.content;
            }

        } catch (error) {
            console.error('LLM Generation Error:', error.message);
            if (error.response) {
                console.error('LLM Response Data:', error.response.data);
            }
            throw new Error('Failed to generate prompt from LLM.');
        }
    }
}

module.exports = new LlmService();
