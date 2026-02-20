'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'app_unlocked'

export default function LockGate({ children }: { children: React.ReactNode }) {
  const isLockEnabled = process.env.NEXT_PUBLIC_APP_LOCK === 'true'
  const correctPassword = process.env.NEXT_PUBLIC_APP_LOCK_PASSWORD ?? ''

  // null = 初期化前（ハイドレーション回避）
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  // クライアントでのみ localStorage を読む
  useEffect(() => {
    if (!isLockEnabled) {
      setUnlocked(true)
      return
    }
    setUnlocked(localStorage.getItem(STORAGE_KEY) === '1')
  }, [isLockEnabled])

  // 初期化前は何も描画しない（SSRとのミスマッチ防止）
  if (unlocked === null) return null

  // ロック無効 or 解除済み → アプリ本体を表示
  if (!isLockEnabled || unlocked) {
    return (
      <>
        {children}
        {/* ロック有効時のみ Logout ボタンを表示 */}
        {isLockEnabled && (
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setUnlocked(false)
              setPwInput('')
              setPwError(false)
            }}
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              padding: '0.4rem 0.9rem',
              background: 'rgba(30,30,50,0.85)',
              color: '#aaa',
              border: '1px solid #444',
              borderRadius: '8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
            }}
          >
            Logout
          </button>
        )}
      </>
    )
  }

  // ── ロック画面 ──────────────────────────────────────────────────────────────

  const noPassword = correctPassword === ''

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (noPassword) return
    if (pwInput === correctPassword) {
      localStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
      setPwError(false)
    } else {
      setPwError(true)
      setPwInput('')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#1a1a2e',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={handleUnlock}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: '#24243c',
          padding: '2rem',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '280px',
        }}
      >
        <span
          style={{
            color: '#e8e8ff',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}
        >
          SOAP Engine{' '}
          <span
            style={{
              background: '#0a84ff',
              color: '#fff',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '0.62rem',
              fontWeight: 700,
              verticalAlign: 'middle',
              marginLeft: '4px',
            }}
          >
            GLP-1
          </span>
        </span>

        {noPassword ? (
          <span style={{ color: '#ff9f0a', fontSize: '0.82rem', fontWeight: 600 }}>
            パスワード未設定のため解除できません
          </span>
        ) : (
          <>
            <input
              type="password"
              autoFocus
              placeholder="パスワードを入力"
              value={pwInput}
              onChange={e => {
                setPwInput(e.target.value)
                setPwError(false)
              }}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: `1.5px solid ${pwError ? '#ff453a' : '#3d3d5c'}`,
                background: '#1a1a2e',
                color: '#e8e8ff',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            {pwError && (
              <span style={{ color: '#ff453a', fontSize: '0.78rem', fontWeight: 600 }}>
                パスワードが正しくありません
              </span>
            )}
            <button
              type="submit"
              style={{
                padding: '0.65rem',
                background: '#0a84ff',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              ロック解除
            </button>
          </>
        )}
      </form>
    </div>
  )
}
