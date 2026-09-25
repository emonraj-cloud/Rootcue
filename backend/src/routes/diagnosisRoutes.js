import express from 'express'
import { createDiagnosis, getDiagnosisHistory, getDiagnosisById } from '../controllers/diagnosisController.js'

const router = express.Router()

router.post('/', createDiagnosis)
router.get('/history', getDiagnosisHistory)
router.get('/:id', getDiagnosisById)

export default router
