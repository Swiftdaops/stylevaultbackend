import express from 'express'
import multer from 'multer'
import cloudinary from '../config/cloudinary.js'

const router = express.Router()

const MAX_IMAGE_UPLOAD_BYTES = 100 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file?.mimetype?.startsWith('image/')) {
      cb(null, true)
      return
    }

    const error = new Error('Only image uploads are allowed')
    error.statusCode = 400
    cb(error)
  },
})

router.post('/image', (req, res) => {
  upload.single('image')(req, res, async (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      if (uploadError.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Image must be 100MB or smaller' })
      }

      return res.status(400).json({ message: uploadError.message || 'Upload failed' })
    }

    if (uploadError) {
      return res.status(uploadError.statusCode || 400).json({ message: uploadError.message || 'Upload failed' })
    }

    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

      const streamUpload = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'stylevault/services', resource_type: 'image' },
            (error, result) => {
              if (result) resolve(result)
              else reject(error)
            }
          )
          stream.end(buffer)
        })

      const result = await streamUpload(req.file.buffer)

      res.json({ url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height })
    } catch (err) {
      console.error('Upload failed', err)
      res.status(500).json({ message: err.message || 'Upload failed' })
    }
  })
})

export default router
