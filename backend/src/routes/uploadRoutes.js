import express from 'express'
import { upload } from '../middleware/uploadMiddleware.js'
import { handleUpload } from '../controllers/uploadController.js'

const router = express.Router()

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message })
    }
    handleUpload(req, res)
  })
})

export default router
