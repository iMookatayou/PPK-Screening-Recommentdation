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

  const menuItems = [
    {
      key: 'screening',
      title: 'คัดกรองอาการ',
      links: [
        { label: 'ระบบแนะนำห้องตรวจ', href: '/erdsppk' },
        { label: 'แบบฟอร์มคัดกรองผู้ป่วย', href: '/formppk' },
      ]
    },
    {
      key: 'special-disease',
      title: 'โรคพิเศษ',
      links: [
        { label: 'โรคพิเศษเฝ้าระวัง', href: '/special-disease-surveillance' },
      ]
    },
    {
      key: 'dashboard',
      title: 'สถิติการใช้ระบบ',
      links: [
        { label: 'ผลรวมการแนะนำห้องตรวจ', href: '/dashboard' },
      ]
    },
    {
      key: 'settpatient-history',
      title: 'บันทึกผู้ป่วย',
      links: [
        { label: 'ประวัติผู้ป่วย', href: '/patient-history' },
      ]
    },
  ]

  // เปิดทุก section ตั้งแต่แรก
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      menuItems.reduce((acc, item) => {
        acc[item.key] = true
        return acc
      }, {} as Record<string, boolean>)
  )

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
