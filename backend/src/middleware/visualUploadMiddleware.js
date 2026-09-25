import multer from 'multer'

const storage = multer.memoryStorage()

export const visualUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for visual analysis'))
    }
    cb(null, true)
  }
})
