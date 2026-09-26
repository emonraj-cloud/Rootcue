import express from 'express'
import {
  createKnowledgeDocument,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
  updateKnowledgeDocument,
  searchKnowledge,
  uploadKnowledgeFile
} from '../controllers/knowledgeController.js'
import uploadKnowledgeFileMiddleware from '../middleware/knowledgeUploadMiddleware.js'

const router = express.Router()

router.post('/', createKnowledgeDocument)
router.get('/', listKnowledgeDocuments)
router.get('/:id', getKnowledgeDocument)
router.put('/:id', updateKnowledgeDocument)
router.delete('/:id', deleteKnowledgeDocument)
router.post('/search', searchKnowledge)
router.post('/upload-file', (req, res, next) => {
  uploadKnowledgeFileMiddleware.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 2 MB.' })
    }
    return res.status(400).json({ success: false, message: err.message || 'Invalid file upload' })
  })
}, uploadKnowledgeFile)

export default router
