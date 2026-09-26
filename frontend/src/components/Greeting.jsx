import { useAuth } from '../context/AuthContext.jsx'
import CrystalIcon from './CrystalIcon.jsx'

// Morning 5:00-11:59, afternoon 12:00-16:59, evening 17:00-20:59, night 21:00-04:59.
function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

const SUBLINES = {
  'Good morning': 'Here is what is happening across your workspace today.',
  'Good afternoon': 'Pick up where you left off. Your AI engine is ready.',
  'Good evening': 'Here is your latest activity at a glance.',
  'Good night': 'Late shift. Your AI engine is still on and ready.'
}

export default function Greeting() {
  const { user } = useAuth()
  const greeting = getGreeting()
  const firstName = (user?.name || '').trim().split(/\s+/)[0]

  return (
    <div className="greeting">
      <div className="greeting-text">
        <div className="greeting-title-row">
          <h1 className="greeting-title">
            {greeting}
            {firstName ? <span className="greeting-name">, {firstName}</span> : null}
          </h1>
          <CrystalIcon className="greeting-icon" />
        </div>
        <p className="greeting-sub">{SUBLINES[greeting]}</p>
      </div>

      <div className="greeting-clock">
        <i className="fa-solid fa-clock" aria-hidden="true"></i>
        <span>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export { getGreeting }
