'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import LoadingSpinner from '@/app/components/ui/LoadingSpinner'
import styles from './styles/SpecialDisease.module.css'

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

// --- utilities ---
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

// type guard กัน ts(2367)
const isCategory = (v: CategoryFilter): v is Category => v !== 'all'

// --- component ---
export default function SpecialDiseaseSurveillancePage() {
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [showAlertPopup, setShowAlertPopup] = useState(false)

  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/diseases`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` || '' },
        })
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('API response is not an array')
        setDiseases(data)
      } catch (error) {
        console.error('Failed to fetch diseases:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDiseases()
  }, [])

  const normSearch = useMemo(() => normalize(searchTerm), [searchTerm])

  const selectedCategoriesFromText = useMemo(
    () => (categoryFilter === 'all' ? detectCategoryQueries(normSearch) : []),
    [normSearch, categoryFilter]
  )

  const remainder = useMemo(() => stripTimeTokens(normSearch), [normSearch])

  const textMatched = useMemo(() => {
    if (!normSearch) return diseases

    // ถ้าเป็นการค้นหาเฉพาะหมวดเวลา (ไม่มีคำอื่น) และยังไม่ได้เลือก dropdown
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

  // บังคับกรองตาม dropdown ถ้าเลือกหมวด
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
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Subcomponent ---------- */
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
                  <td>{d.icd_10 ?? '-'}</td>
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
