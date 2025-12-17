const express = require('express');
const router = express.Router();
const service = require('../src/services/kids-vocabulary-v2');

/**
 * POST /kids-v2/generate
 * Hybrid Generation Endpoint
 */
router.post('/generate', async (req, res) => {
    const { word } = req.body;
    const userIp = req.ip;

    if (!word || typeof word !== 'string') {
        return res.status(400).json({ success: false, error: 'Word is required' });
    }

    if (word.length > 60) {
        return res.status(400).json({ success: false, error: 'Input too long (max 60 chars)' });
    }

    try {
        const result = await service.getOrGenerate(word, userIp);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[KidsV2] Route Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const ghostCleanupService = require('../src/services/ghost-cleanup-service');

/**
 * GET /kids-v2/ghosts
 * Admin: List potential ghost records
 */
router.get('/ghosts', async (req, res) => {
    try {
        const ghosts = await ghostCleanupService.scanGhosts();
        res.json({ success: true, count: ghosts.length, ghosts });
    } catch (error) {
        console.error('[KidsV2] Scan Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /kids-v2/cleanup
 * Admin: Trigger cleanup
 */
router.post('/cleanup', async (req, res) => {
    try {
        const result = await ghostCleanupService.cleanup();
        res.json(result);
    } catch (error) {
        console.error('[KidsV2] Cleanup Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
