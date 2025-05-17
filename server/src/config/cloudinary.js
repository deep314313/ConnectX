const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcdmsspbk',
  api_key: process.env.CLOUDINARY_API_KEY || '489284423516458',
  api_secret: process.env.CLOUDINARY_API_SECRET || '0cKcjHGvEl_hIaP43lx-GDN7QMc'
});

// Create storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connectx',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'],
    resource_type: 'auto' // Automatically detect resource type
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept all file types for now
  cb(null, true);
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit
  }
});

module.exports = {
  cloudinary,
  upload
}; 