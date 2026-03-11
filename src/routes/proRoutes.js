import express from 'express'
import { requestPro } from '../controllers/proController.js'

const router = express.Router()

// Public endpoint to request Pro plan — sends admin email and returns admin whatsapp number
router.post('/', requestPro)

export default router
