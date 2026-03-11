import express from 'express'
import multer from 'multer'
import cloudinary from '../config/cloudinary.js'

const router = express.Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'stylevault/services' }, (error, result) => {
          if (result) resolve(result)
          else reject(error)
        })
        stream.end(buffer)
      })

    const result = await streamUpload(req.file.buffer)

    res.json({ url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height })
  } catch (err) {
    console.error('Upload failed', err)
    res.status(500).json({ message: err.message || 'Upload failed' })
  }
})

export default router
