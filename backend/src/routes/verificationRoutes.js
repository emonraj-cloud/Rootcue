import express from 'express'
import {
  createVerification,
  listVerifications,
  getVerification
} from '../controllers/verificationController.js'

const router = express.Router()

router.post('/', createVerification)
router.get('/', listVerifications)
router.get('/:id', getVerification)

export default router
