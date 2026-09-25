import { useRef, useState, useCallback, useEffect } from 'react'
import { api } from '../api/client.js'
import DiagnosisResultView from '../components/DiagnosisResultView.jsx'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // matches backend limit (10 MB)

export default function VisualDiagnose() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  function handleFileChange(e) {
    const selected = e.target.files && e.target.files[0]
    processFile(selected)
  }

  function processFile(selected) {
    setError('')
    setResult(null)

    if (!selected) {
      setFile(null)
      setPreviewUrl('')
      return
    }

    if (!selected.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP, ...).')
      setFile(null)
      setPreviewUrl('')
      return
    }

    if (selected.size > MAX_IMAGE_BYTES) {
      setError('That image is too large. The maximum size is 10 MB.')
      setFile(null)
      setPreviewUrl('')
      return
    }

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Please choose a screenshot first.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const data = await api.postForm('/api/agents/visual', formData)
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = async (e) => {
      if (loading || result) return // don't interfere if analyzing or showing result

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            e.preventDefault()
            processFile(blob)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [loading, result])

  return (
    <div>
      <h2>Visual Diagnosis</h2>
      <p className="visual-hint">
        Upload a screenshot of the error or problem. Drag & drop, paste (Ctrl+V), or click to browse.
        The AI vision model will analyze the image and tell you what is wrong and how to fix it.
      </p>

      <form className="diagnose-form" onSubmit={handleSubmit}>
        <label>
          Screenshot (PNG, JPG, WebP — max 10 MB)
          <div
            ref={dropZoneRef}
            className={`visual-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file && previewUrl ? (
              <img src={previewUrl} alt="Selected screenshot preview" className="visual-preview" />
            ) : (
              <div className="dropzone-content">
                <span className="dropzone-icon">📷</span>
                <span className="dropzone-text">Drag & drop screenshot here</span>
                <span className="dropzone-hint">or click to browse • paste with Ctrl+V</span>
              </div>
            )}
          </div>
        </label>

        {file && previewUrl && (
          <div className="visual-buttons">
            <button type="submit" disabled={loading || !file}>
              {loading ? 'Analyzing screenshot (this can take a while)...' : 'Analyze Screenshot'}
            </button>
            <button type="button" className="visual-clear-btn" onClick={handleClear} disabled={loading}>
              Clear
            </button>
          </div>
        )}
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && <DiagnosisResultView result={result} />}
    </div>
  )
}

