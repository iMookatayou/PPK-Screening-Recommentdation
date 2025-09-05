'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import LoadingSpinner from '@/app/components/ui/LoadingSpinner'
import styles from './styles/SpecialDisease.module.css'
import { authAxios } from '@/lib/axios'   // ✅ ใช้ instance ที่รองรับ Sanctum แล้ว

interface Disease {
  id: number
  name_th: string
  name_en?: string
  icd_10?: string
  category: '2 ชั่วโมง' | '24 ชั่วโมง' | '48 ชั่วโมง'
  alert: boolean
}

type Category = Disease['category']
type CategoryFilter = 'all' | Category

const THAI_DIGIT_MAP: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
}

// ---------- utils ----------
function normalize(str: string) {
  return (str ?? '')
    .toLowerCase()
    .trim()
    .replace(/[๐-๙]/g, (m) => THAI_DIGIT_MAP[m] ?? m)
    .replace(/\s+/g, ' ')
}

function detectCategoryQueries(term: string): Category[] {
  const t = normalize(term)
  const RX_SEP = ' \\s,;|/()\\-··•'
  const edge = (s: string) => new RegExp(`(^|[${RX_SEP}])(?:${s})(?=($|[${RX_SEP}]))`, 'i')
  const rx2  = edge(`2\\s*(ชม\\.?|ชั่วโมง|h|hr|hrs)`)
  const rx24 = edge(`24\\s*(ชม\\.?|ชั่วโมง|h|hr|hrs)`)
  const rx48 = edge(`48\\s*(ชม\\.?|ชั่วโมง|h|hr|hrs)`)
  const rxUrgent = edge(`(ด่วน|เร่งด่วน)`)

  const out: Category[] = []
  if (rx2.test(t) || rxUrgent.test(t)) out.push('2 ชั่วโมง')
  if (rx24.test(t)) out.push('24 ชั่วโมง')
  if (rx48.test(t)) out.push('48 ชั่วโมง')
  return Array.from(new Set(out))
}

function stripTimeTokens(term: string) {
  let t = normalize(term)
  t = t
    .replace(/(^|\s)2\s*(ชม\.?|ชั่วโมง|h|hr|hrs)(\s|$)/g, ' ')
    .replace(/(^|\s)24\s*(ชม\.?|ชั่วโมง|h|hr|hrs)(\s|$)/g, ' ')
    .replace(/(^|\s)48\s*(ชม\.?|ชั่วโมง|h|hr|hrs)(\s|$)/g, ' ')
    .replace(/(^|\s)(ด่วน|เร่งด่วน)(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t
}

const isCategory = (v: CategoryFilter): v is Category => v !== 'all'

// ---------- page ----------
export default function SpecialDiseaseSurveillancePage() {
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [showAlertPopup, setShowAlertPopup] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const ac = new AbortController()

    async function fetchDiseases() {
      setError(null)
      setLoading(true)
      try {
        // ✅ ใช้ authAxios (Sanctum) — ไม่ต้อง credentials/Authorization เอง
        const res = await authAxios.get('/diseases', { signal: ac.signal })

        // รองรับหลาย payload shapes
        const raw = res.data
        const list: unknown =
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.data) ? raw.data :
          Array.isArray(raw?.items) ? raw.items :
          []

        if (!Array.isArray(list)) throw new Error('API response is not an array')

        if (alive) setDiseases(list as Disease[])
      } catch (e: any) {
        if (!alive) return
        const msg = e?.message || 'โหลดข้อมูลล้มเหลว'
        setError(msg)
        console.error('Failed to fetch /diseases:', e)
      } finally {
        if (alive) setLoading(false)
      }
    }

    fetchDiseases()
    return () => { alive = false; ac.abort() }
  }, [])

  const normSearch = useMemo(() => normalize(searchTerm), [searchTerm])
  const selectedCategoriesFromText = useMemo(
    () => (categoryFilter === 'all' ? detectCategoryQueries(normSearch) : []),
    [normSearch, categoryFilter]
  )
  const remainder = useMemo(() => stripTimeTokens(normSearch), [normSearch])

  const textMatched = useMemo(() => {
    if (!normSearch) return diseases

    if (categoryFilter === 'all' &&
        selectedCategoriesFromText.length > 0 &&
        remainder.length === 0) {
      return diseases
    }

    const words = remainder ? remainder.split(' ').filter(Boolean) : []
    return diseases.filter((d) => {
      const th = normalize(d.name_th)
      const en = normalize(d.name_en ?? '')
      const icd = normalize(d.icd_10 ?? '')
      return words.length === 0
        ? (th.includes(normSearch) || en.includes(normSearch) || icd.includes(normSearch))
        : words.some((w) => th.includes(w) || en.includes(w) || icd.includes(w))
    })
  }, [diseases, normSearch, remainder, categoryFilter, selectedCategoriesFromText.length])

  const base = useMemo(() => {
    if (!isCategory(categoryFilter)) return textMatched
    return textMatched.filter((d) => d.category === categoryFilter)
  }, [textMatched, categoryFilter])

  const categorized: Record<Category, Disease[]> = useMemo(() => ({
    '2 ชั่วโมง': base.filter((d) => d.category === '2 ชั่วโมง'),
    '24 ชั่วโมง': base.filter((d) => d.category === '24 ชั่วโมง'),
    '48 ชั่วโมง': base.filter((d) => d.category === '48 ชั่วโมง'),
  }), [base])

  useEffect(() => {
    const any2h = base.some((d) => d.category === '2 ชั่วโมง')
    setShowAlertPopup((normSearch.length > 0 || (isCategory(categoryFilter) && categoryFilter === '2 ชั่วโมง')) && any2h)
  }, [normSearch, categoryFilter, base])

  const CATEGORY_ORDER: Category[] = ['2 ชั่วโมง', '24 ชั่วโมง', '48 ชั่วโมง']
  const renderDropdownSingle = isCategory(categoryFilter)
  const renderAllCategories = categoryFilter === 'all' && !normSearch
  const renderSelectedFromText =
    categoryFilter === 'all' &&
    selectedCategoriesFromText.length > 0 &&
    remainder.length === 0
  const renderFlatResults = categoryFilter === 'all' && !!normSearch && !renderSelectedFromText
  const selectedOrdered = CATEGORY_ORDER.filter((c) => selectedCategoriesFromText.includes(c))

  // สำหรับข้อความราชการด้านล่าง
  const isSearching = normSearch.length > 0 || isCategory(categoryFilter)
  const searchImplies2h =
    (isCategory(categoryFilter) && categoryFilter === '2 ชั่วโมง') ||
    selectedCategoriesFromText.includes('2 ชั่วโมง')
  const searchImplies24or48 =
    (isCategory(categoryFilter) && (categoryFilter === '24 ชั่วโมง' || categoryFilter === '48 ชั่วโมง')) ||
    selectedCategoriesFromText.some((c) => c === '24 ชั่วโมง' || c === '48 ชั่วโมง')

  return (
    <div className={styles.pageBackground}>
      <div className={styles.card}>
        <h1 className={styles.title}>Special Communicable Disease Surveillance System - ระบบเฝ้าระวังโรคติดต่อพิเศษ</h1>

        <div className={styles.filterRow}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="ค้นหา: ชื่อโรค / ICD-10 "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className={styles.categorySelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            aria-label="กรองตามหมวดเวลา"
          >
            <option value="all">เลือกหมวดช่วงเวลา</option>
            <option value="2 ชั่วโมง">2 ชั่วโมง</option>
            <option value="24 ชั่วโมง">24 ชั่วโมง</option>
            <option value="48 ชั่วโมง">48 ชั่วโมง</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : error ? (
          <div className={styles.errorBox}>{error}</div>
        ) : (
          <>
            {showAlertPopup && (
              <motion.div
                className={styles.popup}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle size={20} className={styles.alertIcon} />
                <span>พบโรคที่ต้องแจ้งภายใน 2 ชั่วโมง!</span>
              </motion.div>
            )}

            {renderDropdownSingle && (
              <CategoryTable
                title={`หมวด: ${categoryFilter}`}
                rows={isCategory(categoryFilter) ? categorized[categoryFilter] : []}
              />
            )}

            {renderAllCategories && CATEGORY_ORDER.map((cat) => (
              <CategoryTable key={cat} title={`หมวด: ${cat}`} rows={categorized[cat]} />
            ))}

            {renderSelectedFromText && selectedOrdered.map((cat) => (
              <CategoryTable key={cat} title={`หมวด: ${cat}`} rows={categorized[cat]} />
            ))}

            {renderFlatResults && (
              <CategoryTable title="ผลการค้นหา" rows={base} />
            )}

            {/* ===== ข้อความราชการใต้ผลค้นหา ===== */}
            {isSearching && (
              <div style={{ marginTop: 12 }}>
                {searchImplies2h && (
                  <GovNote>
                    <strong>กรณีโรคที่ต้องแจ้งภายใน 2 ชั่วโมง:</strong>{' '}
                    โทรแจ้ง <u>งานป้องกันควบคุมโรคและระบาดวิทยา</u> 4552/5826
                    หรือโทร. 081-8620285 / 097-5072491
                  </GovNote>
                )}

                {searchImplies24or48 && (
                  <GovNote>
                    <strong>กรณีโรคที่ต้องแจ้งภายใน 24 ชม. / 48 ชม.:</strong>{' '}
                    <u>ในเวลาราชการ</u> แจ้ง <u>เวชกรรมสังคม</u> 4552
                    หรือโทร 081-8620285{' '}
                    <u>นอกเวลาราชการ</u> *คุณเดือนเต็มดวง โทร 063-4649883
                  </GovNote>
                )}
              </div>
            )}

            {/* บล็อกติดต่อทั่วไปคงที่ */}
            <div style={{ marginTop: 12 }}>
              <GovNote>
                โทรแจ้ง <u>งานป้องกันควบคุมโรคและระบาดวิทยา</u> 4552/5826
                หรือโทร. 081-8620285 / 097-5072491
              </GovNote>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Subcomponents ---------- */
function CategoryTable({ title, rows }: { title: string; rows: Disease[] }) {
  return (
    <div className={styles.categorySection}>
      <h2 className={styles.categoryTitle}>{title}</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ชื่อโรค (TH)</th>
              <th>ชื่อโรค (EN)</th>
              <th>ICD-10</th>
              <th>แจ้งเตือน</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((d) => (
                <tr key={d.id}>
                  <td>{d.name_th}</td>
                  <td>{d.name_en ?? '-'}</td>
                  <ICDCell value={d.icd_10 ?? '-'} />
                  <td>
                    {d.category === '2 ชั่วโมง'
                      ? <span className={styles.alertRed}>แจ้งภายใน 2 ชม.</span>
                      : `ภายใน ${d.category}`}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.noData}>ไม่มีข้อมูล</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** กล่องข้อความราชการแบบเรียบ ไม่พึ่ง CSS ไฟล์ */
function GovNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="note"
      aria-label="ประกาศแจ้งติดต่อหน่วยงาน"
      style={{
        border: '1px solid #cbd5e1',
        borderLeft: '4px solid #334155',
        padding: '10px 12px',
        borderRadius: 8,
        background: '#f8fafc',
        fontSize: 14,
        lineHeight: 1.6,
        color: '#0f172a',
      }}
    >
      {children}
    </div>
  )
}

/** เซลล์ ICD-10: แสดงย่อในตาราง แต่ hover/focus/แตะ เปิดกล่อง popover เห็นเต็ม + คัดลอกได้ */
function ICDCell({ value }: { value: string }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLTableCellElement | null>(null)
  const touchTimer = useRef<number | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const onTouchStart = () => {
    if (touchTimer.current) window.clearTimeout(touchTimer.current)
    touchTimer.current = window.setTimeout(() => setOpen(true), 250) as unknown as number
  }
  const onTouchEnd = () => {
    if (touchTimer.current) {
      window.clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {}
  }

  return (
    <td
      ref={wrapperRef}
      title={value}
      aria-label={value}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative', cursor: 'default' }}
    >
      <span title={value}>{value}</span>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          style={{
            position: 'absolute',
            zIndex: 9999,
            top: '100%',
            left: 0,
            marginTop: 6,
            maxWidth: 520,
            minWidth: 260,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: '10px 12px',
            lineHeight: 1.5,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, color: '#0f172a' }}>{value}</div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={copy}
              style={{
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '4px 8px',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              คัดลอก ICD-10
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '4px 8px',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </td>
  )
}
