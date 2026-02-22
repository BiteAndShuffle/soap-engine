'use client'

import { useState, useEffect } from 'react'
import s from '../styles/lockgate.module.css'

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
        {isLockEnabled && (
          <button
            className={s.logoutBtn}
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setUnlocked(false)
              setPwInput('')
              setPwError(false)
            }}
          >
            Logout
          </button>
        )}
      </>
    )
  }

  // ── ロック画面 ─────────────────────────────────────────────────

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
    <div className={s.overlay}>
      <form onSubmit={handleUnlock} className={s.form}>
        <span className={s.title}>
          SOAP Engine
          <span className={s.badge}>GLP-1</span>
        </span>

        {noPassword ? (
          <span className={s.warning}>パスワード未設定のため解除できません</span>
        ) : (
          <>
            <input
              type="password"
              autoFocus
              placeholder="パスワードを入力"
              value={pwInput}
              className={[s.input, pwError ? s.inputError : ''].join(' ')}
              onChange={e => {
                setPwInput(e.target.value)
                setPwError(false)
              }}
            />
            {pwError && (
              <span className={s.errorText}>パスワードが正しくありません</span>
            )}
            <button type="submit" className={s.submitBtn}>
              ロック解除
            </button>
          </>
        )}
      </form>
    </div>
  )
}
