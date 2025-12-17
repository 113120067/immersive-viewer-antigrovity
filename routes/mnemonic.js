const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const llmService = require('../src/services/llm-service');
const githubStorage = require('../src/services/github-storage');
const axios = require('axios');

// Default Prompt Path
const PROMPT_PATH = path.join(__dirname, '../docs/prompt');

/**
 * GET /mnemonic
 * Render the Visual Mnemonic Generator UI
 */
router.get('/', (req, res) => {
    let defaultSystemPrompt = '';
    try {
        if (fs.existsSync(PROMPT_PATH)) {
            defaultSystemPrompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
        }
    } catch (e) {
        console.error('Failed to read system prompt:', e);
        defaultSystemPrompt = 'Error loading default prompt.';
    }

    res.render('mnemonic', {
        title: 'Visual Mnemonic Generator',
        systemPrompt: defaultSystemPrompt
    });
});

/**
 * POST /mnemonic/generate-architect
 * Role 1: Text LLM generates the image prompt
 */
router.post('/generate-architect', async (req, res) => {
    const { word, systemPrompt, apiKey, baseUrl } = req.body;

    if (!word) return res.status(400).json({ success: false, error: 'Word is required' });
    if (!systemPrompt) return res.status(400).json({ success: false, error: 'System prompt is required' });

    try {
        console.log(`[Architect] Generating for word: ${word}`);
        const rawResponse = await llmService.generatePrompt(systemPrompt, word, {
            apiKey,
            baseUrl
        });

        console.log('[Architect] Raw LLM Response Type:', typeof rawResponse);
        console.log('[Architect] Raw LLM Response:', JSON.stringify(rawResponse, null, 2).substring(0, 500) + '...');

        let result;

        // Case 1: already an object (Axios parsed it)
        if (typeof rawResponse === 'object' && rawResponse !== null) {
            result = rawResponse;
        }
        // Case 2: String
        else if (typeof rawResponse === 'string') {
            let jsonStr = rawResponse.trim();
            // Remove Markdown code blocks if present
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.split('```json')[1].split('```')[0];
            } else if (jsonStr.includes('```')) {
                jsonStr = jsonStr.split('```')[1].split('```')[0];
            }

            try {
                result = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('[Architect] JSON parse failed, utilizing raw text as prompt.');
                result = {
                    image_prompt: rawResponse,
                    labels: { label_a: 'Part A', label_b: 'Part B', master_label: word }
                };
            }
        }
        // Case 3: Unknown
        else {
            result = {
                image_prompt: "Error: Unknown response format",
                labels: { label_a: '?', label_b: '?', master_label: word }
            };
        }

        // Final sanity check for weird Pollinations responses (sometimes nested content)
        if (!result.image_prompt && result.content) {
            result = { image_prompt: result.content, labels: {} };
        }

        console.log('[Architect] Parsed Result:', JSON.stringify(result));

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[Architect] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mnemonic/generate-painter
 * Role 2: Image AI generates the image from proposed prompt
 */
router.post('/generate-painter', async (req, res) => {
    const { prompt, word } = req.body;

    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    // Pollinations Image API (Flux)
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;

    // Direct return of URL to avoid server timeout (Client-side load)
    res.json({
        success: true,
        image: imageUrl
    });
});

/**
 * POST /mnemonic/upload
 * Publish the image to GitHub (API Only)
 */
router.post('/upload', async (req, res) => {
    const { word, imageBase64 } = req.body;

    if (!word || !imageBase64) {
        return res.status(400).json({ success: false, error: 'Missing word or image data' });
    }

    try {
        // Convert base64 back to buffer
        const buffer = Buffer.from(imageBase64, 'base64');

        // Use existing GitHub Service
        const url = await githubStorage.uploadImage(word, buffer, 'jpg');

        if (url) {
            res.json({ success: true, url });
        } else {
            res.status(500).json({ success: false, error: 'Upload failed (Check server logs)' });
        }
    } catch (error) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
