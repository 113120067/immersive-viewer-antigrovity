/**
 * Vision API Routes
 * Handles image upload, OCR, and Azure Computer Vision analysis
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const azureVision = require('../src/services/azureVision');
const { admin, db } = require('../src/config/firebase-admin');

// Configure multer for image uploads (5MB limit, images only)
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_SIZE_LIMIT
  },
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, BMP) are allowed'));
    }
  }
});

/**
 * Upload image to Firebase Storage and get public URL
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type
 * @returns {Promise<string>} - Public URL
 */
async function uploadToFirebaseStorage(buffer, filename, mimeType) {
  if (!admin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  const bucket = admin.storage().bucket();
  const uniqueFilename = `vision-uploads/${Date.now()}-${filename}`;
  const file = bucket.file(uniqueFilename);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType
    },
    public: true
  });

  // Get public URL
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFilename}`;

  console.log('✅ Image uploaded to Firebase Storage:', publicUrl);
  return publicUrl;
}

/**
 * Save analysis result to Firestore
 * @param {Object} data - Analysis data
 * @returns {Promise<string>} - Document ID
 */
async function saveAnalysisToFirestore(data) {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const docRef = await db.collection('vision-analysis').add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('✅ Analysis saved to Firestore:', docRef.id);
  return docRef.id;
}

/**
 * POST /vision/analyze
 * Upload image and perform complete analysis (OCR + Image Analysis)
 */
router.post('/analyze', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log('📤 Processing image upload:', req.file.originalname);

    // Upload to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Perform complete analysis
    const result = await azureVision.completeAnalysis(imageUrl);

    // Prepare data for Firestore
    const analysisData = {
      userId: userId,
      imageUrl: imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ocrText: result.ocr.text,
      ocrLines: result.ocr.lines,
      language: result.ocr.language,
      tags: result.analysis.tags,
      description: result.analysis.description,
      objects: result.analysis.objects,
      categories: result.analysis.categories,
      colors: result.analysis.colors
    };

    // Save to Firestore
    const docId = await saveAnalysisToFirestore(analysisData);

    return res.json({
      success: true,
      analysisId: docId,
      imageUrl: imageUrl,
      result: {
        ocr: result.ocr,
        analysis: result.analysis
      }
    });
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed: ' + error.message
    });
  }
});

/**
 * POST /vision/ocr-only
 * Upload image and perform OCR text extraction only
 */
router.post('/ocr-only', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    console.log('📤 Processing OCR-only request:', req.file.originalname);

    // Upload to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Perform OCR only
    const ocrResult = await azureVision.extractText(imageUrl);

    return res.json({
      success: true,
      imageUrl: imageUrl,
      result: ocrResult
    });
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'OCR failed: ' + error.message
    });
  }
});

/**
 * GET /vision/analysis/:id
 * Retrieve a specific analysis result
 */
router.get('/analysis/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Firestore not available'
      });
    }

    const docRef = db.collection('vision-analysis').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    const data = doc.data();
    
    return res.json({
      success: true,
      analysisId: doc.id,
      data: data
    });
  } catch (error) {
    console.error('❌ Retrieval error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis: ' + error.message
    });
  }
});

/**
 * GET /vision/search
 * Search analysis results by text or tags
 * Query parameters:
 *   - userId: Filter by user ID (required)
 *   - query: Search term
 *   - type: 'text' or 'tags' (default: 'text')
 *   - limit: Max results (default: 20)
 */
router.get('/search', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Firestore not available'
      });
    }

    const userId = req.query.userId;
    const searchQuery = req.query.query || '';
    const searchType = req.query.type || 'text';
    const limit = parseInt(req.query.limit) || 20;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Build query
    let query = db.collection('vision-analysis')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    const results = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // If search query provided, filter results
      if (searchQuery) {
        if (searchType === 'tags') {
          // Search in tags
          const hasMatchingTag = data.tags && data.tags.some(tag => 
            tag.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (hasMatchingTag) {
            results.push({ id: doc.id, ...data });
          }
        } else {
          // Search in OCR text
          if (data.ocrText && data.ocrText.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ id: doc.id, ...data });
          }
        }
      } else {
        // No filter, return all
        results.push({ id: doc.id, ...data });
      }
    });

    return res.json({
      success: true,
      count: results.length,
      results: results
    });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Search failed: ' + error.message
    });
  }
});

/**
 * Error handler for multer errors
 */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit (${IMAGE_SIZE_LIMIT / (1024 * 1024)}MB)`
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + err.message
    });
  }
  // Pass other errors to next handler
  next(err);
});

module.exports = router;
