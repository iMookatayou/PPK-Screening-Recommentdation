'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { Search } from '@/icons'
import { motion } from 'framer-motion'

type Props = {
  selected: number[]
  setSelected: (ids: number[]) => void
  setShowRightPanel: (show: boolean) => void
}

export default function Sidebar({ selected, setSelected, setShowRightPanel }: Props) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    screening: true,
    opd: true,
    symptoms: true,
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSelect = (index: number) => {
    if (!selected.includes(index)) {
      setShowRightPanel(true)
      setSelected([...selected, index])
    } else {
      const newSelected = selected.filter(id => id !== index)
      setSelected(newSelected)
      if (newSelected.length === 0) setShowRightPanel(false)
    }
  }

  const menuItems = [
    {
      key: 'screening',
      title: 'คัดกรองอาการ',
      links: [
        { label: 'ระบบแนะนำห้องตรวจ', href: '/erdsppk' },
        { label: 'แบบฟอร์มคัดกรองผู้ป่วย', href: '/formppk' },
        { label: 'สรุปแบบฟอร์มก่อนพิมพ์', href: '/printsummary' },
        { label: 'ผลรวมการแนะนำห้องตรวจ', href: '/dashboard' },
        { label: 'โรคพิเศษเฝ้าระวัง', href: '/special-disease-surveillance' }
      ]
    },
    {
      key: 'opd',
      title: 'ห้องตรวจ',
      links: [
        { label: 'OPD ศัลย์', href: '/opd-id/surgery' },
        { label: 'OPD Ortho', href: '/opd-id/ortho' },
        { label: 'รพ.เมือง', href: '/opd-id/muanghospital' },
        { label: 'ER', href: '/opd-id/er' },
        { label: 'OPD ENT', href: '/opd-id/ent' },
        { label: 'OPD URO ศัลย์', href: '/opd-id/uro' },
        { label: 'OPD นรีเวช', href: '/opd-id/obgyn' },
        { label: 'OPD Med', href: '/opd-id/med' },
        { label: 'นิติเวช', href: '/opd-id/forensic' },
        { label: 'ER Consult นิติเวช', href: '/opd-id/er-forensic' },
        { label: 'LR', href: '/opd-id/lr' },
        { label: 'OPD ANC', href: '/opd-id/anc' },
        { label: 'OPD จิตเวช', href: '/opd-id/psych' },
        { label: 'OPD 203', href: '/opd-id/room203' },
        { label: 'OPD ทันตกรรม', href: '/opd-id/dent' },
        { label: 'OPD ศัลย์ตกแต่ง', href: '/opd-id/plasticsurg' },
        { label: 'อาชีวเวชกรรม', href: '/opd-id/occupational' },
      ]
    },
  ]

  return (
    <aside className={styles.sidebar}>
      <motion.div
        className={styles.searchWrapper}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder="ค้นหาเมนู..."
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </motion.div>

      {menuItems.map(section => {
        const isOpen = openSections[section.key]
        const filteredLinks = section.links.filter(link =>
          link.label?.toLowerCase().includes(search.toLowerCase())
        )
        if (filteredLinks.length === 0) return null

        return (
          <div key={section.key} className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection(section.key)}
            >
              {section.title} {isOpen ? '▾' : '▸'}
            </button>
            {isOpen && (
              <ul className={styles.linkList}>
                {filteredLinks.map((link: any) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`${styles.link} ${
                        pathname === link.href || pathname.startsWith(link.href)
                          ? styles.active
                          : ''
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </aside>
  )
}
