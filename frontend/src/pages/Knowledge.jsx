import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'

const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.log', '.json', '.csv', '.xml', '.yml', '.yaml',
  '.js', '.ts', '.py', '.java', '.sql', '.html', '.css', '.sh'
]
const MAX_FILE_SIZE = 2 * 1024 * 1024

const TABS = [
  { id: 'library', label: 'Library', icon: 'fa-book' },
  { id: 'paste', label: 'Paste text', icon: 'fa-pen-to-square' },
  { id: 'upload', label: 'Upload file', icon: 'fa-file-arrow-up' },
  { id: 'search', label: 'Search', icon: 'fa-magnifying-glass' }
]

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function relevanceTone(score) {
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

export default function Knowledge() {
  const [tab, setTab] = useState('library')

  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState({ documents: 0, chunks: 0, categories: 0 })
  const [categoryCounts, setCategoryCounts] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)

  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const dragDepth = useRef(0)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [searchLimit, setSearchLimit] = useState(5)

  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadDocuments = useCallback(() => {
    setLoadingDocs(true)
    api
      .get('/api/knowledge')
      .then((data) => {
        setDocuments(data.documents || [])
        setStats(data.stats || { documents: 0, chunks: 0, categories: 0 })
        setCategoryCounts(data.categories || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDocs(false))
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(''), 6000)
    return () => clearTimeout(id)
  }, [flash])

  function processFile(selected) {
    setError('')
    if (!selected) {
      setFile(null)
      setFilePreview('')
      return
    }

    const name = selected.name.toLowerCase()
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`Unsupported file type "${extension || 'none'}". Choose a text or code file.`)
      setFile(null)
      setFilePreview('')
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError(`${selected.name} is ${formatBytes(selected.size)}. The maximum is 2 MB.`)
      setFile(null)
      setFilePreview('')
      return
    }

    setFile(selected)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result || ''
      setFilePreview(text.slice(0, 800) + (text.length > 800 ? '\n...' : ''))
    }
    reader.readAsText(selected)
  }

  function handleClearFile() {
    setFile(null)
    setFilePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // The old page listened for paste on window and turned any pasted text into
  // an upload, which hijacked normal paste into the textareas and silently
  // replaced a file the user had already picked. Pasting is now an explicit
  // action on the upload tab.
  async function handlePasteIntoLibrary() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || !text.trim()) {
        setError('Your clipboard is empty or does not contain text.')
        return
      }
      if (text.length > 2 * 1024 * 1024) {
        setError('Pasted text is larger than 2 MB. Paste it into the Paste text tab instead.')
        return
      }
      setFile(new File([text], 'pasted-content.txt', { type: 'text/plain' }))
      setFilePreview(text.slice(0, 800) + (text.length > 800 ? '\n...' : ''))
      setError('')
    } catch {
      setError('Could not read the clipboard. Use Ctrl+V in the Paste text tab instead.')
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!category.trim() || !title.trim() || !content.trim()) {
      setError('Category, title and content are all required.')
      return
    }
    setAdding(true)
    setError('')
    try {
      const data = await api.post('/api/knowledge', {
        category: category.trim(),
        title: title.trim(),
        content
      })
      setFlash(`"${title.trim()}" added — split into ${data.chunkCount} chunk${data.chunkCount === 1 ? '' : 's'}.`)
      setCategory('')
      setTitle('')
      setContent('')
      setTab('library')
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
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category.trim() || 'uploaded')
      formData.append('title', title.trim() || file.name)

      const data = await api.postForm('/api/knowledge/upload-file', formData)
      setFlash(
        `${data.originalName || file.name} added — ${data.chunkCount} chunk${data.chunkCount === 1 ? '' : 's'}` +
          (data.truncated ? ', truncated at the 500 chunk upload limit.' : '.')
      )
      handleClearFile()
      setCategory('')
      setTitle('')
      setTab('library')
      loadDocuments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingFile(false)
    }
  }

  // The list deliberately omits the body text, so opening a document is a
  // separate fetch rather than shipping every document on every page load.
  async function toggleView(doc) {
    if (viewing?.id === doc.id) {
      setViewing(null)
      return
    }
    setViewing({ id: doc.id, content: '' })
    setViewLoading(true)
    setError('')
    try {
      const data = await api.get(`/api/knowledge/${doc.id}`)
      setViewing({ id: doc.id, content: data.document.content })
    } catch (err) {
      setError(err.message)
      setViewing(null)
    } finally {
      setViewLoading(false)
    }
  }

  async function handleSaveEdit(id) {
    if (!editing.title.trim() || !editing.category.trim() || !editing.content.trim()) {
      setError('Category, title and content are all required.')
      return
    }
    setSavingEdit(true)
    setError('')
    try {
      const data = await api.put(`/api/knowledge/${id}`, {
        category: editing.category.trim(),
        title: editing.title.trim(),
        content: editing.content
      })
      setFlash(`"${editing.title.trim()}" re-embedded into ${data.chunkCount} chunk${data.chunkCount === 1 ? '' : 's'}.`)
      setEditing(null)
      setViewing(null)
      loadDocuments()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    setError('')
    try {
      const data = await api.delete(`/api/knowledge/${id}`)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (viewing?.id === id) setViewing(null)
      if (editing?.id === id) setEditing(null)
      setConfirmDelete(null)
      setFlash(
        `Document removed, along with ${data.chunksRemoved} chunk${data.chunksRemoved === 1 ? '' : 's'}. It can no longer affect a diagnosis.`
      )
      loadDocuments()
    } catch (err) {
      setError(err.message)
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) {
      setError('Type something to search for.')
      return
    }
    setSearching(true)
    setError('')
    try {
      const data = await api.post('/api/knowledge/search', {
        query: query.trim(),
        limit: searchLimit
      })
      setSearchResults(data.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return documents.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false
      if (!q) return true
      return d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    })
  }, [documents, filter, categoryFilter])

  return (
    <div className="kb-page">
      <div className="kb-head">
        <div>
          <h1 className="kb-title">Knowledge Base</h1>
          <p className="kb-sub">
            Documents here are embedded and injected into every diagnosis, so the model answers with
            your environment&apos;s specifics instead of generic advice. Anything wrong in here
            shows up in every answer, so keep it clean.
          </p>
        </div>
        {stats.documents > 0 && (
          <div className="kb-stats">
            <div>
              <strong>{stats.documents}</strong>
              <span>documents</span>
            </div>
            <div>
              <strong>{stats.chunks}</strong>
              <span>chunks</span>
            </div>
            <div>
              <strong>{stats.categories}</strong>
              <span>categories</span>
            </div>
          </div>
        )}
      </div>

      {flash && (
        <div className="kb-flash">
          <i className="fa-solid fa-circle-check"></i>
          {flash}
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      <div className="kb-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`kb-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'paste' && (
        <form className="kb-form" onSubmit={handleAdd}>
          <div className="kb-row">
            <label className="kb-label">
              <span>Category</span>
              <input
                type="text"
                list="kb-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="postgresql, docker, networking"
                maxLength={100}
                required
              />
              <datalist id="kb-categories">
                {categoryCounts.map((c) => (
                  <option key={c.category} value={c.category} />
                ))}
              </datalist>
            </label>
            <label className="kb-label">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="How we restart the staging database"
                maxLength={255}
                required
              />
            </label>
          </div>
          <label className="kb-label">
            <span>
              Content
              <em>{content.length.toLocaleString()} characters</em>
            </span>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the runbook, the error explanation, the config, whatever you keep looking up..."
              required
            />
          </label>
          <button type="submit" className="kb-btn-primary" disabled={adding}>
            {adding ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Embedding chunks...
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus"></i>
                Add document
              </>
            )}
          </button>
        </form>
      )}

      {tab === 'upload' && (
        <form className="kb-form" onSubmit={handleFileUpload}>
          <div className="kb-row">
            <label className="kb-label">
              <span>
                Category <em>optional</em>
              </span>
              <input
                type="text"
                list="kb-categories-upload"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="uploaded"
                maxLength={100}
              />
              <datalist id="kb-categories-upload">
                {categoryCounts.map((c) => (
                  <option key={c.category} value={c.category} />
                ))}
              </datalist>
            </label>
            <label className="kb-label">
              <span>
                Title <em>defaults to the file name</em>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={file?.name || 'Uses the file name'}
                maxLength={255}
              />
            </label>
          </div>

          <div
            className={`kb-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault()
              dragDepth.current += 1
              setDragActive(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (dragDepth.current === 0) setDragActive(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              dragDepth.current = 0
              setDragActive(false)
              processFile(e.dataTransfer.files && e.dataTransfer.files[0])
            }}
            onClick={() => !file && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !file) {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.log,.json,.csv,.xml,.yml,.yaml,.js,.ts,.py,.java,.sql,.html,.css,.sh"
              onChange={(e) => processFile(e.target.files && e.target.files[0])}
              style={{ display: 'none' }}
            />
            {file ? (
              <div className="kb-file">
                <div className="kb-file-head">
                  <i className="fa-solid fa-file-lines"></i>
                  <span className="kb-file-name">{file.name}</span>
                  <span className="kb-file-size">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="kb-file-x"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearFile()
                    }}
                    aria-label="Remove file"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                {filePreview && <pre className="kb-file-preview">{filePreview}</pre>}
              </div>
            ) : (
              <div className="kb-drop-empty">
                <i className="fa-solid fa-cloud-arrow-up kb-drop-icon"></i>
                <span className="kb-drop-text">Drag &amp; drop a text or code file here</span>
                <span className="kb-drop-hint">or click to browse &middot; up to 2 MB</span>
                <button
                  type="button"
                  className="kb-btn-ghost kb-paste-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePasteIntoLibrary()
                  }}
                >
                  <i className="fa-solid fa-clipboard"></i>
                  Or paste from clipboard
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="kb-btn-primary"
            disabled={!file || uploadingFile}
          >
            {uploadingFile ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Embedding chunks...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-arrow-up"></i>
                Upload file
              </>
            )}
          </button>
        </form>
      )}

      {tab === 'search' && (
        <div className="kb-form">
          <form className="kb-searchbar" onSubmit={handleSearch}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Ask something your knowledge base might know..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              value={searchLimit}
              onChange={(e) => setSearchLimit(Number(e.target.value))}
              aria-label="Number of results"
            >
              {[3, 5, 10, 25].map((n) => (
                <option key={n} value={n}>
                  top {n}
                </option>
              ))}
            </select>
            <button type="submit" className="kb-btn-primary" disabled={searching}>
              {searching ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                'Search'
              )}
            </button>
          </form>

          <p className="kb-hint">
            Cosine distance against the stored embeddings, the same lookup a diagnosis performs.
          </p>

          {searchResults === null ? (
            <p className="kb-hint">Search to see which documents a diagnosis would pull in.</p>
          ) : searchResults.length === 0 ? (
            <p className="kb-hint">
              Nothing matched. The knowledge base has{' '}
              {stats.chunks} chunk{stats.chunks === 1 ? '' : 's'} — if it is empty, diagnoses fall back
              to general model knowledge.
            </p>
          ) : (
            <ul className="kb-results">
              {searchResults.map((r) => (
                <li key={r.id} className="kb-result">
                  <div className="kb-result-head">
                    <span className="kb-result-title">{r.title}</span>
                    <span className="kb-result-cat">{r.category}</span>
                    <span className={`kb-relevance kb-relevance--${relevanceTone(r.relevance)}`}>
                      {r.relevance}% match
                    </span>
                  </div>
                  <p className="kb-result-text">{r.chunk_text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'library' && (
        <>
          {documents.length > 3 && (
            <div className="kb-filters">
              <div className="kb-filter-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by title or category..."
                  aria-label="Filter documents"
                />
              </div>
              <select
                className="kb-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categoryCounts.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingDocs ? (
            <div className="kb-list">
              {[0, 1, 2].map((i) => (
                <div key={i} className="kb-skeleton" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="kb-empty">
              <i className="fa-solid fa-book-open kb-empty-icon"></i>
              <p>
                Nothing stored yet. Until you add something, every diagnosis runs on general model
                knowledge only.
              </p>
              <button type="button" className="kb-btn-primary" onClick={() => setTab('paste')}>
                Add your first document
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="kb-empty">
              <p>No document matches the current filter.</p>
              <button
                type="button"
                className="kb-btn-ghost"
                onClick={() => {
                  setFilter('')
                  setCategoryFilter('all')
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="kb-list">
              {visible.map((d) => {
                const isShared = !d.user_id
                const isEditing = editing?.id === d.id
                return (
                  <li key={d.id} className="kb-doc">
                    <div className="kb-doc-main">
                      <div className="kb-doc-head">
                        <span className="kb-doc-cat">{d.category}</span>
                        <h2 className="kb-doc-title">{d.title}</h2>
                        {isShared && (
                          <span className="kb-shared" title="Available to every user">
                            shared
                          </span>
                        )}
                      </div>
                      <div className="kb-doc-meta">
                        <span>{formatBytes(d.content_length)}</span>
                        <span>
                          {d.chunk_count} chunk{d.chunk_count === 1 ? '' : 's'}
                        </span>
                        <span>added {timeAgo(d.created_at)}</span>
                        {d.chunk_count === 0 && (
                          <span className="kb-doc-warn">not embedded, will not be searched</span>
                        )}
                      </div>
                    </div>

                    <div className="kb-doc-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="kb-btn-primary kb-btn-sm"
                            disabled={savingEdit}
                            onClick={() => handleSaveEdit(d.id)}
                          >
                            {savingEdit ? 'Saving' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="kb-btn-ghost kb-btn-sm"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="kb-icon-btn"
                            title={isShared ? 'Shared documents cannot be edited' : 'Edit'}
                            disabled={isShared}
                            onClick={() =>
                              setEditing({
                                id: d.id,
                                category: d.category,
                                title: d.title,
                                content: viewing?.id === d.id ? viewing.content : ''                              })
                            }
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            className="kb-icon-btn"
                            title="View content"
                            onClick={() => toggleView(d)}
                          >
                            <i
                              className={`fa-solid fa-eye${viewing?.id === d.id ? '-slash' : ''}`}
                            ></i>
                          </button>
                          <button
                            type="button"
                            className="kb-icon-btn danger"
                            title={isShared ? 'Shared documents cannot be deleted' : 'Delete'}
                            disabled={isShared}
                            onClick={() => setConfirmDelete(d.id)}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </>
                      )}
                    </div>

                    {viewing?.id === d.id && !isEditing && (
                      <pre className="kb-doc-content">
                        {viewLoading ? 'Loading...' : viewing.content}
                      </pre>
                    )}

                    {isEditing && (
                      <div className="kb-edit">
                        <div className="kb-row">
                          <input
                            value={editing.category}
                            onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                            maxLength={100}
                            aria-label="Category"
                          />
                          <input
                            value={editing.title}
                            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                            maxLength={255}
                            aria-label="Title"
                          />
                        </div>
                        <textarea
                          rows={8}
                          value={editing.content}
                          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                          placeholder="The document content..."
                        />
                        <p className="kb-hint">
                          Saving re-embeds the whole document from scratch, so the chunks stay
                          consistent.
                        </p>
                      </div>
                    )}

                    {confirmDelete === d.id && (
                      <div className="kb-confirm">
                        <p>
                          Delete <strong>{d.title}</strong> and its {d.chunk_count} chunk
                          {d.chunk_count === 1 ? '' : 's'}? It will stop influencing diagnoses
                          immediately.
                        </p>
                        <div>
                          <button
                            type="button"
                            className="kb-btn-danger"
                            disabled={deleting}
                            onClick={() => handleDelete(d.id)}
                          >
                            {deleting ? 'Deleting' : 'Delete document'}
                          </button>
                          <button
                            type="button"
                            className="kb-btn-ghost"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
