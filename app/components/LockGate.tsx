'use client'

/**
 * 状態: Legacy（docs/DEVELOPMENT_STANDARD.md §10.1・§10.2 準拠。Owner 承認済み）
 *
 * 新規作業では使用しない。更新は原則凍結（誤記修正のみ可）。
 *
 * 判定根拠: commit 1517800（"fix: runtime + hydration fixes"）で `middleware.ts`
 * （HTTP リクエストレベルの Basic 認証ゲート）が新規導入されると同時に、同一 commit で
 * `app/layout.tsx` から本コンポーネントの import・使用（`<LockGate>{children}</LockGate>`）
 * が除去された。以降 import 元は 0 件（`app/` / `lib/` を再実測して確認済み）。
 * アクセス制御という設計意図は `middleware.ts` へ移管済みであり、本ファイルは
 * 過去の正式経路として存在した旧方式である。ファイル自体は削除せず、履歴・監査目的で保持する。
 */

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
