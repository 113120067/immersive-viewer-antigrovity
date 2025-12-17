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

    if (!word) {
        return res.status(400).json({ success: false, error: 'Word is required' });
    }

    try {
        const result = await service.getOrGenerate(word, userIp);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[KidsV2] Route Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
