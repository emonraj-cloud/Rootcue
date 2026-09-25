import { useState, useRef, useEffect } from 'react'

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/askai'

export default function AskAI() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPreChat, setShowPreChat] = useState(true)
  const [userInfo, setUserInfo] = useState({ name: '', phone: '', email: '' })
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function getBotReply(text) {
    return text.replace(/^(User|user|USER):\s*/i, '')
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    const token = localStorage.getItem('techpilot_token')

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          problem: input,
          projectId: null
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get AI response')
      }
      const suggestion = data.diagnosis?.solution || data.diagnosis?.rootCause || JSON.stringify(data)
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: getBotReply(suggestion), streaming: false }
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: err.message, streaming: false }
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handlePreChatSubmit(e) {
    e.preventDefault()
    if (userInfo.name) {
      setShowPreChat(false)
      setMessages([
        { role: 'bot', content: 'Hello! I am your AI troubleshooting assistant. How can I help you today?', streaming: false }
      ])
    }
  }

  function resetChat() {
    setMessages([])
    setShowPreChat(true)
    setUserInfo({ name: '', phone: '', email: '' })
  }

  if (!isOpen) {
    return (
      <div className="floating-ai-trigger">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Ask AI"
          className="ask-ai-float-btn"
        >
          <span className="ask-ai-float-circle">
            <i className="fa-solid fa-robot"></i>
          </span>
          <span className="ask-ai-float-label">Ask AI</span>
        </button>
      </div>
    )
  }

  return (
    <div className="ask-ai-floating-page">
      <div className="ask-ai-floating-container">
        {/* Chat Card */}
        <div className={`ask-ai-float-card ${isExpanded ? 'expanded' : ''}`}>
          {/* Header */}
          <div className="ask-ai-float-header">
            <div className="ask-ai-float-header-left">
              <span className="ask-ai-float-avatar">
                <i className="fa-solid fa-robot"></i>
              </span>
              <div>
                <div className="ask-ai-float-name">TechPilot AI</div>
                <div className="ask-ai-float-status">
                  <span className="ask-ai-online-dot"></span> Online
                </div>
              </div>
            </div>
            <div className="ask-ai-float-header-controls">
              <button
                title={isExpanded ? "Minimize" : "Expand"}
                onClick={() => setIsExpanded(!isExpanded)}
                className="ask-ai-float-control"
                aria-label={isExpanded ? "Minimize" : "Expand"}
              >
                <i className={`fa-solid ${isExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
              </button>
              <button
                title="New Chat"
                onClick={resetChat}
                className="ask-ai-float-control"
                aria-label="New Chat"
              >
                <i className="fa-solid fa-plus"></i>
              </button>
              <button
                title="Close"
                onClick={() => setIsOpen(false)}
                className="ask-ai-float-control"
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="ask-ai-float-body">
            {showPreChat ? (
              <form className="ask-ai-prechat-form" onSubmit={handlePreChatSubmit}>
                <div className="ask-ai-prechat-title">Let's start a conversation</div>
                <p className="ask-ai-prechat-desc">
                  Describe your technical problem and our AI will help you troubleshoot it.
                </p>
                <input
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  className="ask-ai-prechat-input"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  autoComplete="tel"
                  className="ask-ai-prechat-input"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  className="ask-ai-prechat-input"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                />
                <button type="submit" className="ask-ai-prechat-submit">
                  Start Chat
                </button>
              </form>
            ) : (
              <div className="ask-ai-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`ask-ai-msg-wrapper ${msg.role === 'user' ? 'user-align' : 'bot-align'}`}>
                    {msg.role === 'bot' && (
                      <span className="ask-ai-msg-avatar">
                        <i className="fa-solid fa-robot"></i>
                      </span>
                    )}
                    <div className={`ask-ai-msg-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                      {msg.streaming && !msg.content ? (
                        <div className="ask-ai-typing">
                          <span></span><span></span><span></span>
                        </div>
                      ) : (
                        <div
                          className="ask-ai-msg-text"
                          dangerouslySetInnerHTML={{ __html: escapeHtml(msg.content) }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          {!showPreChat && (
            <div className="ask-ai-input-area">
              <textarea
                ref={(el) => { if (el) el.style.height = 'auto'; if (el) el.style.height = el.scrollHeight + 'px' }}
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="ask-ai-input-field"
                rows="1"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="ask-ai-send-btn"
                aria-label="Send"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane"></i>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

