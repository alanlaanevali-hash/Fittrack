'use client'

import { useState, useRef } from 'react'

interface ScanResult {
  duration_min?: number
  dist?: number
  hr?: number
  calories?: number
  pace?: string
  speed?: number
  type?: string
  meal_type?: string
  food_name?: string
  protein?: number
  carbs?: number
  fat?: number
}

interface ScanButtonProps {
  type: 'polar' | 'foodvisor'
  onResult: (data: ScanResult) => void
}

export default function ScanButton({ type, onResult }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError('')

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type }),
      })

      const json = await res.json()

      if (json.success) {
        onResult(json.data)
      } else {
        setError('Could not read screenshot. Try again.')
      }
    } catch {
      setError('Upload failed. Try again.')
    }

    setScanning(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={scanning}
        style={{
          background: type === 'polar' ? '#7f1d1d' : '#14532d',
          color: type === 'polar' ? '#fca5a5' : '#86efac',
          border: 'none',
          borderRadius: 10,
          padding: '8px 14px',
          fontWeight: 700,
          fontSize: 12,
          cursor: scanning ? 'not-allowed' : 'pointer',
          opacity: scanning ? 0.7 : 1,
        }}
      >
        {scanning
          ? '⏳ Reading...'
          : type === 'polar'
          ? '📷 Scan Polar'
          : '📷 Scan Foodvisor'}
      </button>
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
}
