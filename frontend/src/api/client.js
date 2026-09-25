const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function getToken() {
  return localStorage.getItem('techpilot_token')
}

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}

  // For FormData (file uploads) the browser must set Content-Type itself
  // so the multipart boundary is included. Only JSON requests get the
  // explicit application/json header.
  if (!isFormData(body)) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData(body) ? body : body ? JSON.stringify(body) : undefined
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body, options = {}) => request(path, { method: 'POST', body, ...options }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' })
}

export function saveToken(token) {
  localStorage.setItem('techpilot_token', token)
}

export function clearToken() {
  localStorage.removeItem('techpilot_token')
}

export function getStoredToken() {
  return getToken()
}
