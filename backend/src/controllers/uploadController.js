import pool from '../config/database.js'

export async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded, or the file type/size was rejected' })
    }

    const result = await pool.query(
      'INSERT INTO files (user_id, original_name, stored_name, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
    )

    res.status(201).json({ success: true, file: result.rows[0] })
  } catch (err) {
    console.error('Upload error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while saving the file' })
  }
}
