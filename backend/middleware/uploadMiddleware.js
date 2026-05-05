const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `vehicle_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed.'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadVehicleFiles = upload.fields([
  { name: 'image',          maxCount: 5 },
  { name: 'revenueLicense', maxCount: 1 },
  { name: 'insurance',      maxCount: 1 },
  { name: 'registration',   maxCount: 1 },
  { name: 'fitness',        maxCount: 1 },
  { name: 'priceJustification', maxCount: 1 },
]);

const uploadKycFiles = upload.fields([
  { name: 'dlFront', maxCount: 1 },
  { name: 'dlBack',  maxCount: 1 },
  { name: 'nic',     maxCount: 1 },
  { name: 'selfie',  maxCount: 1 },
]);

// Helper to build documents array from req.files
const buildDocuments = (files, existing = []) => {
  const DOC_TYPES = ['revenueLicense', 'insurance', 'registration', 'fitness'];
  const docs = [...existing];
  DOC_TYPES.forEach(type => {
    if (files[type] && files[type][0]) {
      const idx = docs.findIndex(d => d.docType === type);
      const entry = { docType: type, fileUrl: `/uploads/${files[type][0].filename}`, uploadedAt: new Date() };
      if (idx >= 0) docs[idx] = entry; else docs.push(entry);
    }
  });
  return docs;
};

module.exports = {
  upload,
  uploadVehicleFiles,
  uploadKycFiles,
  buildDocuments,
  uploadsDir
};
