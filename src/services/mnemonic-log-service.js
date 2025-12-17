const { db } = require('../config/firebase-admin');

class MnemonicLogService {
    constructor() {
        this.collection = 'mnemonic_generations';
    }

    /**
     * Create a new log entry when the Plan (Text AI) is generated.
     */
    async createLog(data) {
        if (!db) {
            console.warn('[MnemonicLog] DB not initialized, skipping log.');
            return null;
        }

        try {
            const docRef = db.collection(this.collection).doc();

            const payload = {
                word: data.word || 'unknown',
                timestamp: new Date().toISOString(),
                // Analysis Data
                analysis: data.analysis || {},
                teaching: data.teaching || {},
                image_prompt: data.image_prompt || '',

                // Status Flags
                status: 'planned', // planned -> painted -> uploaded
                has_image: false,
                is_uploaded: false,

                // Metadata
                client_ip: data.client_ip || 'unknown',
                user_agent: data.user_agent || 'unknown'
            };

            await docRef.set(payload);
            return docRef.id;
        } catch (error) {
            console.error('[MnemonicLog] Create failed:', error);
            return null;
        }
    }

    /**
     * Update log when Image (Painter) is generated.
     */
    async logImageGeneration(logId, imageUrl) {
        if (!db || !logId) return;

        try {
            await db.collection(this.collection).doc(logId).update({
                status: 'painted',
                has_image: true,
                generated_image_url: imageUrl, // Pollinations URL (temporary)
                painted_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[MnemonicLog] Image update failed:', error);
        }
    }

    /**
     * Update log when Image is uploaded to GitHub.
     */
    async logUpload(logId, githubUrl) {
        if (!db || !logId) return;

        try {
            await db.collection(this.collection).doc(logId).update({
                status: 'uploaded',
                is_uploaded: true,
                github_url: githubUrl,
                uploaded_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[MnemonicLog] Upload update failed:', error);
        }
    }

    /**
     * Update log with manual user feedback or edits (Future use)
     */
    async logFeedback(logId, feedbackData) {
        if (!db || !logId) return;

        try {
            await db.collection(this.collection).doc(logId).update({
                feedback: feedbackData,
                last_updated: new Date().toISOString()
            });
        } catch (error) {
            console.error('[MnemonicLog] Feedback update failed:', error);
        }
    }
}

module.exports = new MnemonicLogService();
