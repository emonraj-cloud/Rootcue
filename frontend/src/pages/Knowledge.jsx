import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../api/client.js'

const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.log', '.json', '.csv', '.xml', '.yml', '.yaml',
  '.js', '.ts', '.py', '.java', '.sql', '.html', '.css', '.sh'
]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

export default function Knowledge() {
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [addedMessage, setAddedMessage] = useState('')

  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)

  function loadDocuments() {
    setLoadingDocs(true)
    api
      .get('/api/knowledge')
      .then((data) => setDocuments(data.documents))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDocs(false))
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // Handle clipboard paste for text content
  useEffect(() => {
    const handlePaste = (e) => {
      if (uploadingFile || uploadMessage) return

      const text = e.clipboardData?.getData('text')
      if (text && text.trim().length > 0) {
        e.preventDefault()
        // Create a blob from pasted text
        const blob = new Blob([text], { type: 'text/plain' })
        const pastedFile = new File([blob], 'pasted-content.txt', { type: 'text/plain' })
        processFile(pastedFile)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [uploadingFile, uploadMessage])

  function processFile(selected) {
    setError('')
    setUploadMessage('')

    if (!selected) {
      setFile(null)
      setFilePreview('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const name = selected.name.toLowerCase()
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Unsupported file type. Please choose a text/code file.')
      setFile(null)
      setFilePreview('')
      return
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 2 MB.')
      setFile(null)
      setFilePreview('')
      return
    }

    setFile(selected)

    // Create preview for text files
    if (selected.type.startsWith('text/') || ALLOWED_EXTENSIONS.includes(extension)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result
        // Show first 500 chars as preview
        setFilePreview(content.slice(0, 500) + (content.length > 500 ? '...' : ''))
      }
      reader.readAsText(selected)
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files && e.target.files[0]
    processFile(selected)
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

  function handleClearFile() {
    setFile(null)
    setFilePreview('')
    setUploadMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!category.trim() || !title.trim() || !content.trim()) return

    setAdding(true)
    setError('')
    setAddedMessage('')
    try {
      const data = await api.post('/api/knowledge', { category, title, content })
      setAddedMessage(`Added — split into ${data.chunkCount} chunk(s).`)
      setCategory('')
      setTitle('')
      setContent('')
      loadDocuments()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault()
    if (!file) return

    setUploadingFile(true)
    setError('')
    setUploadMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const data = await api.postForm('/api/knowledge/upload-file', formData)
      setUploadMessage(
        `${data.originalName || file.name} uploaded — split into ${data.chunkCount} chunk(s).` +
        (data.truncated ? ' The file was truncated at the upload chunk limit.' : '')
      )
      handleClearFile()
      loadDocuments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setError('')
    setSearchResults(null)
    try {
      const data = await api.post('/api/knowledge/search', { query })
      setSearchResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <h2>Knowledge Base</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-section">
        <h3>Add a Document</h3>
        <form className="diagnose-form" onSubmit={handleAdd}>
          <label>
            Category
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. postgresql, docker, networking"
              required
            />
          </label>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Content
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the knowledge text here..."
              required
            />
          </label>
          <button type="submit" disabled={adding}>
            {adding ? 'Adding (embedding chunks)...' : 'Add Document'}
          </button>
        </form>
        {addedMessage && <p className="verify-saved">{addedMessage}</p>}
      </div>

      <div className="dashboard-section">
        <h3>Upload a File</h3>
        <p className="visual-hint">
          Upload a text or code file (maximum 2 MB). Drag & drop, paste text (Ctrl+V), or click to browse.
          The file will be automatically chunked and added to your personal knowledge base.
        </p>

        <form className="diagnose-form" onSubmit={handleFileUpload}>
          <label>
            File
            <div
              ref={dropZoneRef}
              className={`knowledge-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
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
                accept=".txt,.md,.log,.json,.csv,.xml,.yml,.yaml,.js,.ts,.py,.java,.sql,.html,.css,.sh"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {file ? (
                <div className="file-preview-container">
                  <div className="file-preview-header">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" className="file-clear-btn" onClick={handleClearFile} disabled={uploadingFile}>✕</button>
                  </div>
                  {filePreview && (
                    <pre className="file-preview-content">{filePreview}</pre>
                  )}
                </div>
              ) : (
                <div className="dropzone-content">
                  <span className="dropzone-icon">📄</span>
                  <span className="dropzone-text">Drag & drop text/code file here</span>
                  <span className="dropzone-hint">or click to browse • paste text with Ctrl+V</span>
                </div>
              )}
            </div>
          </label>

          <button type="submit" disabled={!file || uploadingFile} className="upload-btn">
            {uploadingFile ? 'Uploading (embedding chunks)...' : 'Upload File'}
          </button>
        </form>
        {uploadMessage && <p className="verify-saved">{uploadMessage}</p>}
      </div>

      <div className="dashboard-section">
        <h3>Documents</h3>
        {loadingDocs ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p className="empty-note">No documents yet. Add one above.</p>
        ) : (
          <ul className="activity-list">
            {documents.map((d) => (
              <li key={d.id}>
                <span className="tag">{d.category}</span> {d.title}
                {!d.user_id && <span className="tag tag-shared">shared</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Test Search</h3>
        <form className="inline-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Ask something the knowledge base might know..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults && (
          searchResults.length === 0 ? (
            <p className="empty-note">No matching chunks found.</p>
          ) : (
            <ul className="activity-list">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <span className="tag">{r.category}</span>
                  <strong>{r.title}</strong>
                  <p>{r.chunk_text}</p>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  )
}

