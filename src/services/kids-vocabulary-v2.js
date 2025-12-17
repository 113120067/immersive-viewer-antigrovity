const { db } = require('../config/firebase-admin');
const llmService = require('./llm-service');
const mnemonicLogService = require('./mnemonic-log-service');
const githubStorage = require('./github-storage');
const imageGenerationManager = require('./image-generation-manager');
const ghostCleanupService = require('./ghost-cleanup-service');
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

        const cleanWord = word.trim().toLowerCase();

        // 1. Check DB for existing 'enhanced' or 'basic'
        const snapshot = await db.collection(this.collection)
            .where('word', '==', cleanWord)
            .orderBy('timestamp', 'desc') // Get latest
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();

            // --- SELF-HEALING CHECK ---
            // If record is 'planned' but older than TIMEOUT with no image, it's a GHOST.
            // We should ignore it and let the system regenerate.
            const isGhost = !data.generated_image_url &&
                data.status === 'planned' &&
                (new Date() - new Date(data.timestamp)) > ghostCleanupService.TIMEOUT_MS;

            if (isGhost) {
                console.warn(`[KidsV2] Ghost record detected for "${cleanWord}" (${doc.id}). ignoring and regenerating.`);
                // Optionally: Trigger async cleanup for this specific ID
                // ghostCleanupService.cleanupId(doc.id); // If we had this method
            } else {
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
            // If ghost, we fall through to "No Data" logic below
        }

        // 2. Case C: No data -> FAST PATH
        console.log(`[KidsV2] No data for ${cleanWord}. Executing Fast Path.`);

        // A. Generate Basic Image (V1 Logic)
        // FORCE SAFE STYLE: Append strict keywords
        const safetySuffix = ", cute kid-friendly style, soft colors, warm lighting, vector art, 3d render style, G-rated, masterpiece, best quality, no text, no scary elements";
        const v1Prompt = `cute cartoon illustration of ${cleanWord}` + safetySuffix;

        console.log(`[KidsV2] Fast Path: Generating for ${cleanWord}...`);

        // Use Manager
        let imageUrl = '';
        try {
            // Fallback to simple URL if manager fails or for speed, but let's try Manager for consistency.
            // Since Fast Path needs to be FAST, Pollinations is perfect.
            const imageResult = await imageGenerationManager.generateImage({
                prompt: v1Prompt,
                provider: 'pollinations',
                userId: 'fast_path_v1',
                options: {
                    model: 'flux',
                    seed: Math.floor(Math.random() * 1000000)
                }
            });

            if (imageResult.success) {
                imageUrl = imageResult.imageUrl;
            } else {
                console.error('[KidsV2] Fast Path Generation Failed:', imageResult.error);
                // Fallback to error placeholder or empty
                imageUrl = '';
            }
        } catch (e) {
            console.error('[KidsV2] Fast Path Error:', e);
            imageUrl = '';
        }

        // B. Save to DB (Basic)
        const logId = await mnemonicLogService.createLog({
            word: cleanWord,
            image_prompt: v1Prompt,
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
        // Extract basic prompt from LLM result
        // FIX: Handle case where AI doesn't return image_prompt or uses different casing
        let corePrompt = parsedResult.image_prompt || parsedResult.imagePrompt || `A cute cartoon illustration explaining the word ${word}`;

        // FORCE SAFE STYLE: Append strict keywords to overrides any weird style from LLM
        // This MUST match the specs in reporting_system_specs.md
        const safetySuffix = ", cute kid-friendly style, soft colors, warm lighting, vector art, 3d render style, G-rated, masterpiece, best quality, no text, no scary elements";
        const safePrompt = corePrompt + safetySuffix;

        console.log(`[KidsV2] Generating Safe Image with prompt: ${safePrompt.substring(0, 50)}...`);

        let finalImageUrl = null;
        let uploadStatus = 'painted';
        let githubUrl = null;

        try {
            // Use Manager instead of manual URL
            const imageResult = await imageGenerationManager.generateImage({
                prompt: safePrompt,
                provider: 'pollinations', // Default to free provider
                userId: 'system_upgrade',
                options: {
                    model: 'flux',
                    seed: Math.floor(Math.random() * 1000000)
                }
            });

            if (imageResult.success) {
                finalImageUrl = imageResult.imageUrl; // Temporary URL

                // 3. Upload to GitHub
                // We need to fetch the image buffer to upload to GitHub
                // The manager gives us a URL, so we still need to fetch it.
                // In the future, Manager could handle upload, but for now we do it here to keep Logic in Service.

                try {
                    console.log(`[KidsV2] Downloading image for GitHub upload...`);
                    const imageRes = await axios.get(finalImageUrl, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(imageRes.data, 'binary');

                    // Upload using existing service (handles hashing: SHA256(word).jpg)
                    githubUrl = await githubStorage.uploadImage(word, buffer, 'jpg');

                    if (githubUrl) {
                        finalImageUrl = githubUrl;
                        uploadStatus = 'uploaded';
                        console.log(`[KidsV2] GitHub Upload Success: ${githubUrl}`);
                    }
                } catch (uploadErr) {
                    console.error('[KidsV2] GitHub Upload Failed:', uploadErr.message);
                    // We still have the temporary URL, so we continue
                }

            } else {
                console.error('[KidsV2] Image Generation Failed:', imageResult.error);
                return; // Abort update if image failed
            }

        } catch (err) {
            console.error('[KidsV2] Upgrade Error:', err);
            return;
        }

        // 4. Update DB
        if (db) {
            await db.collection(this.collection).doc(logId).update({
                analysis: parsedResult.analysis,
                teaching: parsedResult.teaching,
                image_prompt: safePrompt, // Log the actual used prompt

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
