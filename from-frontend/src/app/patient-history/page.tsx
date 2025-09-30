'use client';

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { authAxios } from '@/lib/axios';
import { clinicLabelMap } from '@/app/components/questionpath/clinicLabelMap';
import { ClipboardList, Search as IconSearch, CalendarRange } from 'lucide-react';
import styles from './styles/PatientHistory.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/app/components/ui/popup/ToastProvider';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

/* ===================== Types ===================== */
type LiteItem = {
  case_id: string;
  name: string;
  created_at: string;              // "Y-m-d H:i:s"
  summary_clinics?: string[] | any[] | string | null;
  symptoms?: string[] | any[] | string | null;
};
type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};
type LiteResp = {
  data: LiteItem[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
};
type DetailQR = {
  question: string;
  question_title?: string;
  clinic?: string[] | null;
  symptoms?: string[] | null;
  note?: string | null;
  is_refer_case: boolean;
  type: 'form' | 'guide' | 'referral' | 'kiosk';
  routed_by?: string | null;
  created_at?: string;
};
type DetailCase = {
  case_id: string;
  cid: string;
  name: string;
  age: number;
  gender: string;
  maininscl_name?: string | null;
  hmain_name?: string | null;
  summary_clinics?: string[];
  symptoms?: string[];
  created_at: string;
  question_results: DetailQR[];
};
type ApiResp<T> = { code: string; message: string; data: T; errors?: unknown };

/* ===================== Utils ===================== */

/* ---------- Tiny Chip helpers (no style logic) ---------- */
function Chip({
  children,
  size = 'md',
  variant = 'default',
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md';
  variant?: 'default' | 'clinic' | 'sym';
}) {
  const cls = [
    styles.chip,
    size === 'sm' ? styles.chipSm : '',
    variant === 'clinic' ? styles.chipClinic : '',
    variant === 'sym' ? styles.chipSym : '',
  ].join(' ');
  return <span className={cls}>{children}</span>;
}

function renderSymChips(all: string[], limit = 3) {
  const head = all.slice(0, limit);
  const more = Math.max(0, all.length - head.length);
  return (
    <>
      {head.map((s, i) => (
        <Chip key={i} size="sm" variant="sym">{s} </Chip>
      ))}
      {more > 0 && <span className={styles.badgeMore}>+{more}</span>}
    </>
  );
}

function fmt(dt?: string) {
  if (!dt) return '—';
  const iso = dt.includes('T') ? dt : dt.replace(' ', 'T');
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(iso));
}

function toStringList(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return [];
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
    return [s];
  }
  if (Array.isArray(input)) {
    return input
      .map((it) => {
        if (typeof it === 'string') return it;
        if (it && typeof it === 'object') {
          const o = it as any;
          return o.label ?? o.name ?? o.symptom ?? o.value ?? o.text ?? o.code ?? '';
        }
        return '';
      })
      .map(x => String(x ?? '').trim())
      .filter(Boolean);
  }
  return [String(input)];
}

const SYM_EXCLUDE = new RegExp(
  String.raw`(^note$|^flag$|^in_hours$|^has_case_doc$|^stable$|^no_injury$|(_|^)(pain_)?scale(_\d+)?$|(_|^)(score|grade)(_\d+)?$)`,
  'i'
);

function filterSymptoms(sym?: string[] | any[] | string | null): string[] {
  const base = toStringList(sym);
  const out = base
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .filter(s => !SYM_EXCLUDE.test(s.toLowerCase()));
  return Array.from(new Set(out));
}

function formatSymptoms(sym?: string[] | any[] | string | null, limit = 3): React.ReactNode {
  const arr = filterSymptoms(sym);
  if (!arr.length) return '—';
  if (arr.length <= limit) return <span className={styles.symText}>{arr.join(', ')}</span>;

  const head = arr.slice(0, limit).join(', ');
  const more = arr.length - limit;
  return (
    <>
      <span className={styles.symText}>{head}</span>
      <span className={styles.badgeMore}>+{more} เพิ่มเติม</span>
    </>
  );
}

function formatSymptomsText(sym?: string[] | any[] | string | null, limit = 3): string {
  const arr = filterSymptoms(sym);
  if (!arr.length) return '—';
  if (arr.length <= limit) return arr.join(', ');
  const head = arr.slice(0, limit).join(', ');
  const more = arr.length - limit;
  return `${head} +${more} เพิ่มเติม`;
}

function displayGender(g?: string) {
  if (!g) return '—';
  const s = String(g).trim().toLowerCase();
  if (s === '1' || s === 'm' || s === 'male') return 'ชาย';
  if (s === '2' || s === 'f' || s === 'female') return 'หญิง';
  if (s === '3') return 'ไม่ระบุ';
  if (s.includes('ชาย')) return 'ชาย';
  if (s.includes('หญิง')) return 'หญิง';
  return 'ไม่ระบุ';
}

function normalizeHistoryPayload(raw: any): LiteResp {
  if (raw?.items && raw?.meta) {
    return {
      data: raw.items ?? [],
      meta: {
        current_page: raw.meta.current_page ?? 1,
        last_page: raw.meta.last_page ?? 1,
        per_page: raw.meta.per_page ?? (raw.items?.length ?? 10),
        total: raw.meta.total ?? (raw.items?.length ?? 0),
      },
    };
  }
  const r = raw as Partial<LaravelPaginator<LiteItem>>;
  return {
    data: r?.data ?? [],
    meta: {
      current_page: (r as any)?.current_page ?? 1,
      last_page: (r as any)?.last_page ?? 1,
      per_page: (r as any)?.per_page ?? (r?.data?.length ?? 10),
      total: (r as any)?.total ?? (r?.data?.length ?? 0),
    },
  };
}

/* ===================== Motion Variants ===================== */
const cardVar = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };
const rowVar = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.16, delay: i * 0.02 } }),
};
const dividerVar = { hidden: { scaleX: 0, opacity: 0 }, show: { scaleX: 1, opacity: 1, transition: { duration: 0.25 } } };

/* ===================== iPad-safe Datepicker ===================== */
const supportsShowPicker = typeof window !== 'undefined' && 'showPicker' in HTMLInputElement.prototype;

function isIOSiPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac, ตรวจจับด้วย touch
  const iPadOS = /Macintosh/.test(ua) && 'ontouchend' in window;
  return iOS || iPadOS;
}

/** เปิด datepicker ได้ทั้ง Chromium และ iPad Safari */
function openDatePickerSafely(el: HTMLInputElement) {
  if (!el) return;
  if (supportsShowPicker) {
    // Chromium, Edge, etc.
    (el as any).showPicker?.();
    return;
  }
  // iOS/iPad Safari fallback
  // - ไม่ใช้ preventDefault
  // - ปิดคีย์บอร์ดด้วย inputMode="none"
  // - toggle readOnly แล้ว focus ภายใต้ user gesture
  const prev = el.readOnly;
  el.readOnly = false;
  // การ focus ใน iOS จะเรียก spinner ถ้า type=date
  requestAnimationFrame(() => {
    el.focus();
    setTimeout(() => {
      el.readOnly = prev;
    }, 0);
  });
}

/** สร้างชิปแบบจำกัดจำนวน + ตัวนับ */
function renderChips(
  items: string[] | any[] | string | null | undefined,
  { limit = 3, variant = 'sym' }: { limit?: number; variant?: 'sym'|'clinic' }
) {
  const arr = (variant === 'sym' ? filterSymptoms(items as any) : toStringList(items))
    .map(x => String(x).trim())
    .filter(Boolean);

  if (!arr.length) return <span className={styles.muted}>—</span>;

  const head = arr.slice(0, limit);
  const more = arr.length - head.length;

  return (
    <>
      {head.map((t, i) => (
        <span
          key={`${variant}-${i}-${t}`}
          className={`${styles.chip} ${styles.chipSm} ${variant === 'clinic' ? styles.chipClinic : styles.chipSym}`}
          title={t}
        >
          {t}
        </span>
      ))}
      {more > 0 && <span className={styles.badgeMore}>+{more}</span>}
    </>
  );
}

/** แสดง “ชิปอาการ • ชิปคลินิก (+N)” ในแถวเดียวแบบย่อ */
function renderSymAndClinicInline(sym: any, clinics: any) {
  const S = filterSymptoms(sym);
  const C = toStringList(clinics);
  return (
    <>
      <span className={styles.tagRow}>
        {renderChips(S, { limit: 2, variant: 'sym' })}
      </span>
      {C.length > 0 && <span className={styles.sepDot}>•</span>}
      <span className={styles.tagRow}>
        {renderChips(C, { limit: 2, variant: 'clinic' })}
      </span>
    </>
  );
}

/* ===================== Component ===================== */
export default function PatientHistory() {
  const { addToast } = useToast();

  const [cid, setCid] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [range, setRange] = useState<'' | 'today' | 'last_7d' | 'last_30d' | 'this_month'>('');
  const [list, setList] = useState<LiteResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string>('');
  const [detail, setDetail] = useState<DetailCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchingRef = useRef(false);

  const fetchHistory = useCallback(
    async (page = 1) => {
      if (fetchingRef.current) return;
      setError(null);

      const onlyDigits = cid.replace(/\D/g, '').slice(0, 13);
      if (!onlyDigits) {
        setError('กรุณากรอกเลขบัตรประชาชน (CID)');
        addToast({ type: 'warning', message: 'กรุณากรอก CID', position: 'top-right' });
        return;
      }

      setLoading(true);
      setDetail(null);
      setSelected('');
      fetchingRef.current = true;

      try {
        const body: any = { cid: onlyDigits, page, per_page: 10 };
        if (range) body.range = range;
        else {
          if (start) body.start_date = start;
          if (end) body.end_date = end;
        }

        const res = await authAxios.post<ApiResp<{ items: LiteItem[]; meta: any }>>('/patients/history', body, {
          signal: AbortSignal.timeout(15000),
        });
        const normalized = normalizeHistoryPayload(res.data.data);
        setList(normalized);

        if (normalized.meta.total > 0) {
          addToast({
            type: 'success',
            message: `ค้นหาสำเร็จ: พบ ${normalized.meta.total} รายการ`,
            position: 'top-right',
          });
        } else {
          addToast({ type: 'info', message: 'ไม่พบรายการ', position: 'top-right' });
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'โหลดข้อมูลล้มเหลว';
        setList(null);
        setError(msg);
        addToast({ type: 'error', message: `ค้นหาล้มเหลว: ${msg}`, position: 'top-right' });
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [cid, range, start, end, addToast]
  );

  const pickCase = useCallback(
    async (case_id: string) => {
      setSelected(case_id);
      setDetail(null);
      if (!case_id) return;
      setDetailLoading(true);
      try {
        const res = await authAxios.post<ApiResp<DetailCase>>(
          '/form-ppk/show',
          { case_id },
          { signal: AbortSignal.timeout(15000) }
        );
        setDetail(res.data.data);
        addToast({ type: 'success', message: 'โหลดรายละเอียดเคสแล้ว', position: 'top-right' });
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'โหลดรายละเอียดล้มเหลว';
        setError(msg);
        addToast({ type: 'error', message: `โหลดรายละเอียดล้มเหลว: ${msg}`, position: 'top-right' });
      } finally {
        setDetailLoading(false);
      }
    },
    [addToast]
  );

  const firstResultTime = useMemo(() => {
    const t = detail?.question_results?.[0]?.created_at;
    return t ? fmt(t) : '—';
  }, [detail]);

  /* ----------------- Dropdown (เหมือนเดิม) ----------------- */
  function CaseDropdown({
    items, value, onChange,
  }: { items: LiteItem[]; value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const btnRef = useRef<HTMLButtonElement | null>(null);
    const listboxId = 'history-listbox';
    useEffect(() => {
      btnRef.current?.setAttribute('aria-expanded', open ? 'true' : 'false');
    }, [open]);

    const filtered = useMemo(() => {
      const qq = q.trim().toLowerCase();
      if (!qq) return items;
      return items.filter((it) => {
        const sym = filterSymptoms(it.symptoms).join(' ').toLowerCase();
        return it.name.toLowerCase().includes(qq) || sym.includes(qq) || fmt(it.created_at).toLowerCase().includes(qq);
      });
    }, [items, q]);

    const selectedItem = items.find((x) => x.case_id === value) || null;
    const activeId = value ? `option-${value}` : undefined;
    
    return (
        <div className={`${styles.dropdown} ${styles.dropdownCase}`}>
          <label className={styles.label}>เลือกเคส</label>

          <button
            ref={btnRef}
            id="caseDropdownButton"
            type="button"
            className={styles.comboButton}
            onClick={() => setOpen(v => !v)}
            aria-haspopup="listbox"
            aria-controls={listboxId}
          >
            {selectedItem ? (
              <>
                <span className={styles.comboMain}>
                  {fmt(selectedItem.created_at)} • {selectedItem.name}
                </span>
                  <span className={styles.comboSubs}>
                    {(() => {
                      const syms = filterSymptoms(selectedItem.symptoms);
                      const clinics = toStringList(selectedItem.summary_clinics).map(c => clinicLabelMap[c] || c);
                      return (
                        <>
                          {/* symptoms chips (ตัด 0–2 อัน + ตัวนับเพิ่มเติม) */}
                          <span className={styles.tagRow}>
                            {renderSymChips(syms, 2)}
                          </span>
                          {/* คั่นนิดนึง */}
                          {clinics.length > 0 && <span className={styles.sepDot}>•</span>}
                          {/* clinic chips 1–2 อัน */}
                          <span className={styles.tagRow}>
                            {clinics.slice(0, 2).map((c, i) => (
                              <Chip key={i} size="sm" variant="clinic">{c}</Chip>
                            ))}
                            {clinics.length > 2 && <span className={styles.badgeMore}>+{clinics.length - 2}</span>}
                          </span>
                        </>
                      );
                    })()}
                  </span>
              </>
            ) : (
              <span className={styles.comboPlaceholder}>— เลือกเคส —</span>
            )}
          </button>

        {open && (
          <div className={styles.comboPanel} role="region" aria-label="ตัวเลือกเคส">
            <div className={styles.comboSearchRow}>
              <IconSearch className={styles.comboSearchIcon} aria-hidden />
              <input
                className={styles.comboSearch}
                placeholder="ค้นหาชื่อ / อาการ / วันที่"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                aria-label="ค้นหาในรายการเคส"
              />
            </div>

            {filtered.length === 0 ? (
              <div role="status" aria-live="polite" className={styles.comboEmpty}>
                ไม่พบรายการ
              </div>
            ) : (
              <ul
                id={listboxId}
                role="listbox"
                className={styles.comboList}
                aria-labelledby="caseDropdownButton"
                aria-activedescendant={activeId}         
                aria-multiselectable="false"
              >
                {filtered.map((row) => {
                  const liId = `option-${row.case_id}`;
                  const active = value === row.case_id;
                  const all = filterSymptoms(row.symptoms);

                  return (
                    <li
                      id={liId}                            
                      key={row.case_id}
                      role="option"
                      className={active ? `${styles.comboItem} ${styles.comboItemActive}` : styles.comboItem}
                      data-selected={active ? '1' : '0'} 
                      onClick={() => { onChange(row.case_id); setOpen(false); }}
                      tabIndex={-1}
                    >
                      <div className={styles.itemTop}>
                        <span className={styles.itemTime}>{fmt(row.created_at)}</span>
                        <span className={styles.itemName}>{row.name}</span>
                      </div>
                      <div className={styles.itemBottom}>
                        {all.length
                          ? all.map((s, i) => <span key={i} className={styles.chip}>{s}</span>)
                          : <span className={styles.muted}>— ไม่มีอาการ —</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ----------------- Render ----------------- */
  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>
        <ClipboardList className={styles.titleIcon} aria-hidden />
        <span>Patient history from screening - ประวัติผู้ป่วยจากการคัดกรอง</span>
      </h2>

      {/* Search card */}
      <motion.div
        className={styles.card}
        variants={cardVar}
        initial="hidden"
        animate="show"
        role="search"
        aria-label="ค้นหาประวัติผู้ป่วย"
      >
        <div className={`${styles.row} ${styles.filtersRowTop}`}>
          <div className={styles.col4}>
            <label className={styles.label} htmlFor="cidInput">เลขบัตรประชาชน (CID)</label>
            <div className={styles.inputWithIcon}>
              <IconSearch className={styles.inputIcon} aria-hidden />
              <input
                id="cidInput"
                name="cid"
                className={styles.field}
                value={cid}
                onChange={(e) => setCid(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="ค้นหาเลขบัตรประชาชน 13 หลัก"
                title="กรอกเลขบัตรประชาชน 13 หลัก"
                aria-label="เลขบัตรประชาชน"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>

          <div className={`${styles.col3} ${styles.rangeCol}`}>
            <label className={styles.label} htmlFor="rangeSelect">ช่วงเวลา</label>
            <div className={styles.inputWithIcon}>
              <CalendarRange className={styles.inputIcon} aria-hidden />
              <select
                id="rangeSelect"
                name="range"
                className={styles.field}
                value={range}
                onChange={(e) => { setRange(e.target.value as any); setStart(''); setEnd(''); }}
              >
                <option value="">— เลือก —</option>
                <option value="today">วันนี้</option>
                <option value="last_7d">7 วันล่าสุด</option>
                <option value="last_30d">30 วันล่าสุด</option>
                <option value="this_month">เดือนนี้</option>
              </select>
            </div>
          </div>

          <div className={`${styles.col5} ${styles.rightEnd}`}>
            <button
              id="searchBtn"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnTop}`}
              onClick={() => fetchHistory(1)}
              disabled={loading}
              title="กดเพื่อค้นหาประวัติ"
              aria-label="ค้นหา"
            >
              <span className={styles.btnLabel} data-loading={loading ? '1' : '0'}>
                <span className={styles.labelIdle}>ค้นหา</span>
              </span>
            </button>
          </div>
        </div>

        <div className={`${styles.row} ${styles.filtersRowDates}`}>
          <div className={`${styles.col3} ${styles.dateItem}`}>
            <label className={styles.label} htmlFor="startDate">วันที่เริ่ม</label>
            <input
              id="startDate"
              name="start_date"
              type="date"
              className={`${styles.field} ${styles.dateAuto}`}
              value={start}
              onChange={(e) => { setRange(''); setStart(e.target.value); }}
              autoComplete="off"
              inputMode="none"
              onClick={(e) => openDatePickerSafely(e.currentTarget)}
              onTouchEnd={(e) => openDatePickerSafely(e.currentTarget)}
            />
          </div>

          <div className={`${styles.col3} ${styles.dateItem}`}>
            <label className={styles.label} htmlFor="endDate">วันที่สิ้นสุด</label>
            <input
              id="endDate"
              name="end_date"
              type="date"
              className={`${styles.field} ${styles.dateAuto}`}
              value={end}
              onChange={(e) => { setRange(''); setEnd(e.target.value); }}
              autoComplete="off"
              inputMode="none"
              onClick={(e) => openDatePickerSafely(e.currentTarget)}
              onTouchEnd={(e) => openDatePickerSafely(e.currentTarget)}
            />
          </div>
        </div>

        {error && <div role="alert" className={styles.errorText}>{error}</div>}
      </motion.div>

      {/* Selector + List */}
      <motion.div className={styles.card} variants={cardVar} initial="hidden" animate="show">
        <div className={styles.row}>
          <div className={styles.col12}>
            <CaseDropdown items={list?.data ?? []} value={selected} onChange={(v) => pickCase(v)} />
            {!list?.data?.length && (
              <div className={styles.muted} id="emptyListMsg">ยังไม่มีรายการ (กรุณาค้นหาก่อน)</div>
            )}
          </div>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <LoadingSpinner message="กำลังค้นหาประวัติ..." size={48} />
          ) : (
            <table className={styles.table} aria-label="ตารางประวัติผู้ป่วย">
              <thead>
                <tr>
                  <th className={styles.colMenu} aria-label="เมนู"></th>
                  <th className={styles.colNo}>ลำดับ</th>
                  <th>วันที่/เวลา</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>อาการ</th>
                  <th>คลินิก</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {list?.data?.length ? (
                    list.data.map((row, i) => {
                      const isActive = selected === row.case_id;
                      const symList = filterSymptoms(row.symptoms);
                      const clinicList = toStringList(row.summary_clinics).map(c => clinicLabelMap[c] || c);

                      const symHead = symList.slice(0, 2);
                      const cliHead = clinicList.slice(0, 2);
                      const symMore = symList.length - symHead.length;
                      const cliMore = clinicList.length - cliHead.length;

                      return (
                        <motion.tr
                          key={row.case_id}
                          custom={i}
                          variants={rowVar}
                          initial="hidden"
                          animate="show"
                          exit={{ opacity: 0 }}
                          className={isActive ? styles.activeRow : undefined}
                          onClick={() => pickCase(row.case_id)}
                          role="button"
                          tabIndex={0}
                        >
                          <td className={styles.tdMenu}>
                            <button
                              type="button"
                              className={styles.menuBtn}
                              aria-label="เมนูเพิ่มเติมของแถวนี้"
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <span className={styles.menuDot} />
                              <span className={styles.menuDot} />
                              <span className={styles.menuDot} />
                            </button>
                          </td>

                          <td>{i + 1}</td>
                          <td>{fmt(row.created_at)}</td>
                          <td>{row.name}</td>

                          {/* อาการ */}
                          <td className={styles.tdTags}>
                            <div className={styles.tagRow}>
                              {symHead.map((s, k) => (
                                <span key={k} className={`${styles.chip} ${styles.chipSm} ${styles.chipSym}`} title={s}>{s}</span>
                              ))}
                              {symMore > 0 && <span className={styles.badgeMore}>+{symMore}</span>}
                            </div>
                          </td>

                          {/* คลินิก */}
                          <td className={styles.tdTags}>
                            <div className={styles.tagRow}>
                              {cliHead.map((c, k) => (
                                <span key={k} className={`${styles.chip} ${styles.chipSm} ${styles.chipClinic}`} title={c}>{c}</span>
                              ))}
                              {cliMore > 0 && <span className={styles.badgeMore}>+{cliMore}</span>}
                              {clinicList.length === 0 && <span className={styles.muted}>—</span>}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.tableEmpty}>ไม่มีข้อมูล — กรอก CID แล้วกดค้นหา</td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {(list?.meta?.last_page ?? 1) > 1 && !loading && (
          <div className={styles.pagination} role="navigation" aria-label="เปลี่ยนหน้า">
            {Array.from({ length: list?.meta?.last_page ?? 1 }).map((_, idx) => {
              const active = (list?.meta?.current_page ?? 1) === idx + 1;
              return (
                <button
                  key={idx}
                  className={[styles.btn, styles.pageBtn, active ? styles.pageBtnActive : ''].join(' ')}
                  onClick={() => fetchHistory(idx + 1)}
                  title={`ไปหน้าที่ ${idx + 1}`}
                  aria-label={`ไปหน้าที่ ${idx + 1}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* รายละเอียดเคส */}
      <motion.div className={styles.card} variants={cardVar} initial="hidden" animate="show" aria-live="polite">
        <div className={styles.sectionTitle}>รายละเอียดเคสที่เลือก</div>

        {!selected && !detailLoading && <div className={styles.muted}>ยังไม่ได้เลือกเคส</div>}

        {detailLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
            <LoadingSpinner message="กำลังโหลดรายละเอียดเคส..." size={44} />
          </div>
        )}

        {detail && !detailLoading && (
          <>
            <div className={styles.grid2}>
              <div>ชื่อ</div><div>{detail.name}</div>
              <div>CID</div><div>{detail.cid}</div>
              <div>อายุ/เพศ</div><div>{detail.age} / {displayGender(detail.gender)}</div>
              <div>สิทธิ/รพ.หลัก</div>
              <div>{detail.maininscl_name || '—'} / {detail.hmain_name || '—'}</div>
              <div>เวลาสร้างเคส</div><div>{fmt(detail.created_at)}</div>
            </div>

            <div className={styles.blockTop}>
              <div className={styles.sectionTitle}>เวลาคัดกรอง (รายการแรก)</div>
              <div>{firstResultTime}</div>
            </div>

            <motion.hr className={styles.hr} variants={dividerVar} initial="hidden" animate="show" />

            <div className={styles.blockTop}>
              <div className={styles.sectionTitle}>
                รายละเอียดการประเมิน ({detail.question_results.length})
              </div>

              <div className={styles.qrList}>
                <AnimatePresence initial={false}>
                  {detail.question_results.map((qr, i) => {
                    const clinics = Array.isArray(qr.clinic) ? qr.clinic : [];
                    const clinicLabels = clinics.map(c => clinicLabelMap[c] || c);
                    const symList = toStringList(qr.symptoms);

                    return (
                      <motion.div
                        key={i}
                        className={styles.qrItem}
                        custom={i}
                        variants={rowVar}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0 }}
                      >
                        {/* บรรทัดหัว: เลขลำดับ + ชื่อคำถาม */}
                        <div className={styles.qrHeaderLine}>
                          <span className={styles.qrIndexBox}>{i + 1}</span>
                          <span className={styles.qrTitleText}>{qr.question_title || qr.question}</span>
                        </div>

                        {/* บรรทัดประเภท (FORM/...) แยกบรรทัดตามรูปตัวอย่าง */}
                        <div className={styles.qrTypeLine}>
                          <span className={styles.qrTypeBadge}>{(qr.type || 'FORM').toUpperCase()}</span>
                        </div>

                        {/* เวลา */}
                        <div className={styles.qrTimeLine}>{fmt(qr.created_at)}</div>

                        {/* บรรทัดรายละเอียด: คลินิก • อาการ • หมายเหตุ */}
                        <div className={styles.qrInfoLine}>
                          <b>คลินิก:</b>&nbsp;{clinicLabels.join(', ') || '—'}
                          {symList.length > 0 && (
                            <>
                              <span className={styles.dotSep} aria-hidden> • </span>
                              <b>อาการ:</b>&nbsp;{symList.join(', ')}
                            </>
                          )}
                          {qr.note && (
                            <>
                              <span className={styles.dotSep} aria-hidden> • </span>
                              <b>หมายเหตุ:</b>&nbsp;{qr.note}
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );

}
