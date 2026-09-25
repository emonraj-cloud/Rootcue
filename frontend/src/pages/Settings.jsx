import { useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Settings() {
  const { user, updateUser } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')
    setProfileError('')
    try {
      const data = await api.put('/api/auth/me', { name })
      updateUser(data.user)
      setProfileMessage('Profile updated.')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      return
    }

    setPasswordSaving(true)
    try {
      await api.put('/api/auth/password', { currentPassword, newPassword })
      setPasswordMessage('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div>
      <h2>Settings</h2>

      <div className="dashboard-section">
        <h3>Profile</h3>
        <form className="diagnose-form" onSubmit={handleProfileSave} style={{ maxWidth: 400 }}>
          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={user?.email || ''} disabled />
          </label>
          {profileError && <div className="error-banner">{profileError}</div>}
          {profileMessage && <p className="verify-saved">{profileMessage}</p>}
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="dashboard-section">
        <h3>Change Password</h3>
        <form className="diagnose-form" onSubmit={handlePasswordSave} style={{ maxWidth: 400 }}>
          <label>
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {passwordError && <div className="error-banner">{passwordError}</div>}
          {passwordMessage && <p className="verify-saved">{passwordMessage}</p>}
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

