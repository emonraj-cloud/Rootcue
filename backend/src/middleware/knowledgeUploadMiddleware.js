import multer from 'multer'

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.log', '.json', '.csv', '.xml', '.yml', '.yaml',
  '.js', '.ts', '.py', '.java', '.sql', '.html', '.css', '.sh'
])

const MAX_FILE_SIZE = 2 * 1024 * 1024

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const originalName = file.originalname || ''
    const lastDot = originalName.lastIndexOf('.')
    const extension = lastDot >= 0 ? originalName.slice(lastDot).toLowerCase() : ''

    if (!TEXT_EXTENSIONS.has(extension)) {
      return cb(new Error('Only text/code files are allowed: .txt, .md, .log, .json, .csv, .xml, .yml, .yaml, .js, .ts, .py, .java, .sql, .html, .css, .sh'))
    }

    cb(null, true)
  }
})

export default upload
