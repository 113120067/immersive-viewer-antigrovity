const { db } = require('../config/firebase-admin');

class GhostCleanupService {
    constructor() {
        this.collection = 'mnemonic_generations';
        this.archiveCollection = 'mnemonic_ghosts_archive';
        // Timeout in milliseconds (e.g., 10 minutes)
        this.TIMEOUT_MS = 10 * 60 * 1000;
    }

    /**
     * Find potential ghost records.
     * Criteria: 
     * 1. Status == 'planned' (or stuck in 'painting' if we had that status)
     * 2. Created > 10 mins ago
     * 3. No image URL
     */
    async scanGhosts() {
        if (!db) return [];

        const cutoffTime = new Date(Date.now() - this.TIMEOUT_MS).toISOString();
        const ghosts = [];

        try {
            // Firestore doesn't support complex OR queries easily for "missing fields",
            // so we query by status 'planned' and filter manually.
            // Also check for missing status or missing quality_tier which indicates old V1 bugs.

            // Firestore composite index might be missing for status + timestamp.
            // Since 'planned' records should be few, we filter timestamp in memory.
            const snapshot = await db.collection(this.collection)
                .where('status', '==', 'planned')
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                // Client-side timestamp check
                // Ensure data.timestamp exists
                if (data.timestamp && data.timestamp < cutoffTime) {
                    if (!data.generated_image_url && !data.github_url) {
                        ghosts.push({ id: doc.id, ...data });
                    }
                }
            });

            console.log(`[GhostCleanup] Found ${ghosts.length} ghost records.`);
            return ghosts;
        } catch (error) {
            console.error('[GhostCleanup] Scan failed:', error);
            return [];
        }
    }

    /**
     * Archive and Delete ghost records.
     */
    async cleanup() {
        if (!db) return { success: false, message: 'DB not initialized' };

        const ghosts = await this.scanGhosts();
        if (ghosts.length === 0) {
            return { success: true, count: 0, message: 'No ghost records found.' };
        }

        const batch = db.batch();
        const mainRef = db.collection(this.collection);
        const archiveRef = db.collection(this.archiveCollection);
        let count = 0;

        for (const ghost of ghosts) {
            // 1. Copy to Archive
            const docRef = archiveRef.doc(ghost.id);
            batch.set(docRef, {
                ...ghost,
                archived_at: new Date().toISOString(),
                archive_reason: 'ghost_cleanup_timeout'
            });

            // 2. Delete from Main
            batch.delete(mainRef.doc(ghost.id));
            count++;
        }

        try {
            await batch.commit();
            console.log(`[GhostCleanup] Successfully cleaned up ${count} records.`);
            return { success: true, count: count, cleanedIds: ghosts.map(g => g.id) };
        } catch (error) {
            console.error('[GhostCleanup] Batch commit failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new GhostCleanupService();
