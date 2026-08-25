import { useState } from 'react'
import { photoUrl } from '../api/client'
import { initialsOf } from '../utils/name'

export default function CandidateAvatar({
  name,
  photo,
  size = 48,
  round = false,
  className = '',
}) {
  const [broken, setBroken] = useState(false)
  const src = broken ? null : photoUrl(photo)

  return (
    <div
      className={`sp-face ${round ? 'sp-face-round' : ''} ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.33) }}
    >
      {src ? (
        <img src={src} alt={name || 'Candidate'} onError={() => setBroken(true)} />
      ) : (
        <span>{initialsOf(name, '?')}</span>
      )}
    </div>
  )
}
