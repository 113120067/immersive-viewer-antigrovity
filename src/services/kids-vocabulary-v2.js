const { db } = require('../config/firebase-admin');
const llmService = require('./llm-service');
const mnemonicLogService = require('./mnemonic-log-service');
const githubStorage = require('./github-storage');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class KidsVocabularyV2Service {
    constructor() {
        this.collection = 'mnemonic_generations';
        this.PROMPT_PATH = path.join(__dirname, '../../docs/prompt');
    }

    async getSystemPrompt() {
        try {
            return fs.readFileSync(this.PROMPT_PATH, 'utf-8');
        } catch (e) {
            console.error('Failed to read system prompt:', e);
            return 'You are an expert etymology teacher.';
        }
    }

    /**
     * Main Entry Point
     * Returns { type: 'basic'|'enhanced', data: ... }
     */
    async getOrGenerate(word, userIp) {
        if (!db) throw new Error('Database not available');

        const cleanWord = word.trim();

        // 1. Check DB for existing 'enhanced' or 'basic'
        const snapshot = await db.collection(this.collection)
            .where('word', '==', cleanWord)
            .orderBy('timestamp', 'desc') // Get latest
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();

            // Case A: Enhanced (Mnemonic Ready)
            if (data.quality_tier === 'enhanced' || data.status === 'painted' || data.status === 'uploaded') {
                return {
                    type: 'enhanced',
                    data: data,
                    logId: doc.id
                };
            }

            // Case B: Basic (Fast V1) exists
            return {
                type: 'basic',
                data: data,
                logId: doc.id
            };
        }

        // 2. Case C: No data -> FAST PATH
        console.log(`[KidsV2] No data for ${cleanWord}. Executing Fast Path.`);

        // A. Generate Basic Image (V1 Logic)
        const v1Prompt = `cute cartoon illustration of ${cleanWord}, safe for kids, G-rated, simple vector art, vibrant colors, for primary school educational material, white background, high quality, no guns, no blood, no violence, no nudity`;
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(v1Prompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;

        // B. Save to DB (Basic)
        const logId = await mnemonicLogService.createLog({
            word: cleanWord,
            image_prompt: v1Prompt, // V1 prompt
            generated_image_url: imageUrl,
            analysis: null, // No analysis yet
            teaching: null,
            client_ip: userIp,

            // Custom fields for V2
            source: 'kids-v2',
            quality_tier: 'basic',
            status: 'basic_generated'
        });

        // C. Trigger Background Upgrade (Fire and Forget)
        this.upgradeToEnhanced(cleanWord, logId).catch(err => console.error('[KidsV2] Background upgrade failed:', err));

        // D. Return Basic Result
        return {
            type: 'basic',
            data: {
                word: cleanWord,
                generated_image_url: imageUrl,
                quality_tier: 'basic'
            },
            logId: logId
        };
    }

    /**
     * Background Task: Analysis + Mnemonic Generation + GitHub Upload
     */
    async upgradeToEnhanced(word, logId) {
        console.log(`[KidsV2] Starting Background Upgrade for ${word} (${logId})`);

        // 1. Text Analysis (Layer 1-3)
        const systemPrompt = await this.getSystemPrompt();
        const analysisResult = await llmService.generatePrompt(systemPrompt, word, {}); // Use env API key

        // Parse result
        let parsedResult = analysisResult;
        if (typeof analysisResult === 'string') {
            try {
                let jsonStr = analysisResult.replace(/```json|```/g, '').trim();
                parsedResult = JSON.parse(jsonStr);
            } catch (e) {
                console.error('[KidsV2] JSON parse error in upgrade:', e);
                return;
            }
        }

        // 2. Generate Mnemonic Image (Painter)
        const mnemonicPrompt = parsedResult.image_prompt;
        const seed = Math.floor(Math.random() * 1000000);
        const smartImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(mnemonicPrompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;

        // 3. Upload to GitHub
        let finalImageUrl = smartImageUrl;
        let githubUrl = null;
        let uploadStatus = 'painted';

        try {
            console.log(`[KidsV2] Downloading image for GitHub upload...`);
            const imageRes = await axios.get(smartImageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageRes.data, 'binary');

            // Upload using existing service (handles hashing: SHA256(word).jpg)
            githubUrl = await githubStorage.uploadImage(word, buffer, 'jpg');

            if (githubUrl) {
                finalImageUrl = githubUrl;
                uploadStatus = 'uploaded';
                console.log(`[KidsV2] GitHub Upload Success: ${githubUrl}`);
            }
        } catch (err) {
            console.error('[KidsV2] GitHub Upload Failed:', err.message);
        }

        // 4. Update DB
        if (db) {
            await db.collection(this.collection).doc(logId).update({
                analysis: parsedResult.analysis,
                teaching: parsedResult.teaching,
                image_prompt: mnemonicPrompt,

                generated_image_url: finalImageUrl,
                github_url: githubUrl,

                quality_tier: 'enhanced',
                status: uploadStatus,
                upgraded_at: new Date().toISOString()
            });
            console.log(`[KidsV2] Upgrade Complete for ${word}`);
        }
    }
}

module.exports = new KidsVocabularyV2Service();
