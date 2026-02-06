import { useEffect, useRef, useState } from 'react'

export default function CameraScanner({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch {
        onClose()
      }
    }
    start()
    return () => {
      const s = streamRef.current
      if (s) s.getTracks().forEach(t => t.stop())
    }
  }, [onClose])

  const capture = async () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
    }, 'image/png')
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '90vw', maxWidth: '800px' }}>
        <h3 style={{ marginTop: 0 }}>Scanner</h3>
        <div style={{ position: 'relative' }}>
          <video ref={videoRef} style={{ width: '100%', borderRadius: '8px' }} playsInline />
          <div style={{
            position: 'absolute',
            inset: '10%',
            border: '2px solid var(--primary-color)',
            borderRadius: '8px',
            pointerEvents: 'none'
          }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={onClose}>Fermer</button>
          <button onClick={capture} disabled={!ready}>Capturer</button>
        </div>
      </div>
    </div>
  )
}
