import { useRef, useState, useCallback, useEffect } from 'react'
import { api } from '../api/client.js'
import DiagnosisResultView from '../components/DiagnosisResultView.jsx'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // matches visualUploadMiddleware on the backend
const ACCEPTED = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp'

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function validateFile(selected) {
  if (!selected) return 'No file was selected.'
  if (!selected.type.startsWith('image/')) {
    return 'That is not an image. Upload a screenshot (PNG, JPG, WebP or GIF).'
  }
  if (selected.size > MAX_IMAGE_BYTES) {
    return `That image is ${formatBytes(selected.size)}. The maximum size is 10 MB.`
  }
  return ''
}

export default function VisualDiagnose() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const dragDepth = useRef(0)

  // Object URLs leak until they are revoked, and this page can be re-entered
  // many times in a session, so tie the lifetime of each preview to the file.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const processFile = useCallback((selected) => {
    const problem = validateFile(selected)
    setResult(null)
    setError(problem)
    if (problem) {
      setFile(null)
      setPreviewUrl('')
      return
    }
    setFile(selected)
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(selected)
    })
  }, [])

  function handleFileChange(e) {
    processFile(e.target.files && e.target.files[0])
  }

  function handleClear() {
    setFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // dragenter/dragleave fire for every child element, so a naive toggle makes
  // the zone flicker. Counting enter/leave pairs keeps the highlight stable.
  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    setDragActive(true)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setDragActive(false)
    processFile(e.dataTransfer.files && e.dataTransfer.files[0])
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Choose a screenshot first.')
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
      setError(err.message || 'Failed to analyze the screenshot')
    } finally {
      setLoading(false)
    }
  }

  // Paste a screenshot straight from the clipboard.
  useEffect(() => {
    function handlePaste(e) {
      if (loading || result) return
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
  }, [loading, result, processFile])

  return (
    <div className="vd-page">
      <div className="vd-header">
        <div className="vd-header-icon">
          <i className="fa-solid fa-eye"></i>
        </div>
        <div>
          <h1 className="vd-title">Visual Diagnose</h1>
          <p className="vd-subtitle">
            Upload a screenshot of an error or a broken screen. The vision model reads it and
            describes the problem, the likely root cause and how to fix it.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className={`vd-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={file ? undefined : openPicker}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Upload a screenshot"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            className="vd-file-input"
          />

          {file && previewUrl ? (
            <div className="vd-preview-wrap">
              <img src={previewUrl} alt="Selected screenshot preview" className="vd-preview" />
              <div className="vd-file-meta">
                <div className="vd-file-name">{file.name}</div>
                <div className="vd-file-size">{formatBytes(file.size)}</div>
              </div>
            </div>
          ) : (
            <div className="vd-empty">
              <i className="fa-solid fa-cloud-arrow-up vd-empty-icon"></i>
              <div className="vd-empty-title">Drag &amp; drop a screenshot here</div>
              <div className="vd-empty-hint">
                or click to browse &middot; paste with Ctrl+V &middot; PNG, JPG, WebP, GIF up to 10 MB
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="vd-actions">
            <button type="submit" className="vd-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Analyzing screenshot...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass-chart"></i>
                  Analyze Screenshot
                </>
              )}
            </button>
            <button type="button" className="vd-btn-ghost" onClick={handleClear} disabled={loading}>
              <i className="fa-solid fa-rotate-left"></i>
              Clear
            </button>
          </div>
        )}
      </form>

      {error && (
        <div className="vd-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      {loading && (
        <div className="vd-thinking">
          <div className="vd-thinking-bar"></div>
          <p className="vd-thinking-text">
            The vision model is reading the screenshot. A first run can take a minute while the
            model loads.
          </p>
        </div>
      )}

      {result && <DiagnosisResultView result={result} />}
    </div>
  )
}
