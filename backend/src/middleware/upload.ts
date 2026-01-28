import multer from 'multer';
import path from 'path';

// Configure multer for memory storage (we'll process the file in memory)
const storage = multer.memoryStorage();

// File filter to only accept CSV and Excel files
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    callback(null, true);
  } else {
    callback(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Create multer upload middleware
export const uploadFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}).single('file');

// Wrapper to handle multer errors
export const handleUpload = (req: any, res: any, next: any) => {
  uploadFile(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { message: 'File too large. Maximum size is 10MB.' }
        });
      }
      return res.status(400).json({
        success: false,
        error: { message: `Upload error: ${err.message}` }
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: { message: err.message }
      });
    }
    next();
  });
};
