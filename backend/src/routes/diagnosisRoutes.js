import express from 'express'
import {
  createDiagnosis,
  getDiagnosisHistory,
  getDiagnosisById,
  deleteDiagnosis
} from '../controllers/diagnosisController.js'

const router = express.Router()

router.post('/', createDiagnosis)
router.get('/history', getDiagnosisHistory)
router.get('/:id', getDiagnosisById)
router.delete('/:id', deleteDiagnosis)

export default router
