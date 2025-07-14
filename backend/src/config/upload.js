const multer = require('multer');
const sharp = require('sharp');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Image processing function
const processImage = async (buffer, mimetype) => {
  try {
    // Resize and optimize image
    const processedBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      buffer: processedBuffer,
      contentType: 'image/jpeg',
      size: processedBuffer.length
    };
  } catch (error) {
    throw new Error('Error processing image: ' + error.message);
  }
};

module.exports = { upload, processImage };
