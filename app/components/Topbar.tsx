'use client'

import s from '../styles/layout.module.css'

interface TopbarProps {
  title: string
  badge?: string
  searchValue: string
  onSearchChange: (value: string) => void
}

export default function Topbar({
  title,
  badge,
  searchValue,
  onSearchChange,
}: TopbarProps) {
  return (
    <header className={s.topbar}>
      <span className={s.topbarTitle}>
        {title}
        {badge && <span className={s.topbarBadge}>{badge}</span>}
      </span>

      <input
        type="search"
        className={s.searchInput}
        placeholder="モジュール検索…"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        aria-label="モジュール検索"
      />
    </header>
  )
}
