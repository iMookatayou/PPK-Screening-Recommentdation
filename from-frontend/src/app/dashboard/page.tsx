"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { RefreshCcw, XCircle, X as IconX, Search } from "lucide-react";
import { motion } from "framer-motion";
import { getTitle } from "@/app/components/utils/getTitle";
import styles from "./styles/Dashboard.module.css";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";

/* ------------ types ------------ */
type SummaryItem = {
  symptom?: string;
  question_key?: string;
  question?: string;
  total?: number | string;
  date?: string;
};
type ChartMode = "bar" | "line";
type QuickRange = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";
type SourceMode = "both" | "guide" | "form";

/* ------------ colors ------------ */
const C_REF = "#4f46e5"; // แนะนำ
const C_FORM = "#f97316"; // เคสจริง

/* ------------ a11y helpers ------------ */
const ariaPressed = (on: boolean) =>
  on ? ({ "aria-pressed": "true" as const }) : ({} as Record<string, never>);
const ariaSelected = (on: boolean) =>
  on ? ({ "aria-selected": "true" as const, tabIndex: 0 }) : ({ tabIndex: -1 } as const);

/* ------------ utils (Thai time) ------------ */
// สร้าง Date ตามเขตเวลาเป้าหมาย โดยไม่พึ่งเวลาเครื่องของผู้ใช้
function zonedNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || "0");
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}
const TZ = "Asia/Bangkok"; // เวลาไทย

function resolveApiBase() {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
function toKey(it: SummaryItem): string {
  if (it.symptom && it.symptom.trim()) return it.symptom.trim();
  const raw = (it.question_key || it.question || "").trim();
  if (!raw) return "ไม่ทราบอาการ";
  const m = raw.match(/\d+/);
  if (m) {
    const id = parseInt(m[0], 10);
    if (Number.isFinite(id)) return getTitle(id);
  }
  return raw;
}
function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ------------ fetch helpers ------------ */
async function fetchJSON(path: string, headers: HeadersInit) {
  const base = resolveApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
  return json.data as SummaryItem[];
}
async function fetchReferralQuiet(headers: HeadersInit, from?: string, to?: string) {
  const legacyPath =
    from && to
      ? `/api/referral-guidances/summary?from=${from}&to=${to}`
      : `/api/referral-guidances/summary`;
  const legacy = await fetchJSON(legacyPath, headers).catch(() => []);
  if (legacy.length > 0) return legacy;

  const base = resolveApiBase();
  const q = new URLSearchParams({ type: "guide" });
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const r = await fetch(`${base}/api/summary?${q.toString()}`, { headers }).catch(() => null);
  if (!r || !r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j?.data) ? (j.data as SummaryItem[]) : [];
}
async function fetchFormQuiet(headers: HeadersInit, from?: string, to?: string) {
  const legacyPath =
    from && to ? `/api/form-ppk/summary?from=${from}&to=${to}` : `/api/form-ppk/summary`;
  const legacy = await fetchJSON(legacyPath, headers).catch(() => []);
  if (legacy.length > 0) return legacy;

  const base = resolveApiBase();
  const q = new URLSearchParams({ type: "form" });
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const r = await fetch(`${base}/api/summary?${q.toString()}`, { headers }).catch(() => null);
  if (!r || !r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j?.data) ? (j.data as SummaryItem[]) : [];
}
function toCountMap(rows: SummaryItem[]) {
  const m: Record<string, number> = {};
  for (const it of rows || []) {
    const k = toKey(it);
    const raw: any = it.total ?? 0;
    const v = typeof raw === "string" ? Number(raw) : Number(raw ?? 0);
    m[k] = (m[k] || 0) + (Number.isFinite(v) ? v : 0);
  }
  return m;
}

/* ===========================================
   TagMultiSelect (chips + ค้นหา, no libraries)
   =========================================== */
type TagMultiSelectProps = {
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  maxMenuHeight?: number;
};

function TagMultiSelect({
  options, values, onChange,
  placeholder = "พิมพ์เพื่อค้นหาโรค…",
  ariaLabel = "เลือกโรคหลายรายการ",
  maxMenuHeight = 240
}: TagMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !values.includes(o))
      .filter((o) => (q ? o.toLowerCase().includes(q) : true))
      .slice(0, 200);
  }, [options, values, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (name: string) => {
    if (!values.includes(name)) onChange([...values, name]);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };
  const remove = (name: string) => {
    onChange(values.filter((v) => v !== name));
    inputRef.current?.focus();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Backspace" && !query && values.length) {
      e.preventDefault();
      onChange(values.slice(0, -1));
    } else if ((e.key === "Enter" || e.key === "Tab") && filtered.length) {
      e.preventDefault();
      add(filtered[0]);
    } else if (e.key === "ArrowDown") {
      setOpen(true);
    }
  };

  return (
    <div className={styles.chipSelectRoot} ref={rootRef} aria-label={ariaLabel}>
      {values.map((v) => (
        <span key={v} className={styles.chip}>
          {v}
          <button type="button" className={styles.chipX} aria-label={`ลบ ${v}`} onClick={() => remove(v)}>
            <IconX size={14} />
          </button>
        </span>
      ))}

      <div className={styles.chipInputWrap}>
        <Search size={14} className={styles.chipSearchIcon} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e)=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>setOpen(true)}
          onKeyDown={onKeyDown}
          className={styles.chipInput}
          placeholder={values.length ? "" : placeholder}
          aria-label={ariaLabel}
        />
      </div>

      {open && (
        <div className={styles.chipMenu} role="listbox" style={{ maxHeight: maxMenuHeight }}>
          {filtered.length === 0 ? (
            <div className={styles.chipEmpty}>ไม่พบรายการ</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                className={styles.chipOption}
                title={opt}
                onClick={()=>add(opt)}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------ component ------------ */
export default function ReferralStatsDashboardPage() {
  const [mode, setMode] = useState<ChartMode>("bar");
  const [sourceMode, setSourceMode] = useState<SourceMode>("both");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refMap, setRefMap] = useState<Record<string, number>>({});
  const [formMap, setFormMap] = useState<Record<string, number>>({});
  const [topN, setTopN] = useState<10 | 20 | 50>(20);

  // เวลา "วันนี้" อ้างอิงโซนไทย
  const todayTH = useMemo(() => zonedNow(TZ), []);

  // time range (อ้างอิงเวลาไทย)
  const [range, setRange] = useState<QuickRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [fromDate, toDate] = useMemo(() => {
    if (range === "all" || range === "custom") return [undefined, undefined] as const;
    const end = new Date(todayTH);
    const start = new Date(todayTH);
    if (range === "7d") start.setDate(start.getDate() - 6);
    if (range === "30d") start.setDate(start.getDate() - 29);
    if (range === "90d") start.setDate(start.getDate() - 89);
    if (range === "ytd") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return [fmtDate(start), fmtDate(end)] as const;
  }, [range, todayTH]);

  const effectiveFrom = range === "custom" ? (customFrom || undefined) : fromDate;
  const effectiveTo = range === "custom" ? (customTo || undefined) : toDate;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token");
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      const [r, f] = await Promise.all([
        fetchReferralQuiet(headers, effectiveFrom, effectiveTo),
        fetchFormQuiet(headers, effectiveFrom, effectiveTo),
      ]);
      setRefMap(toCountMap(r));
      setFormMap(toCountMap(f));
    } catch (e: any) {
      setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setRefMap({});
      setFormMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (range === "custom") {
      if (customFrom && customTo) load();
    } else { load(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const onApplyCustom = () => {
    if (range !== "custom") setRange("custom");
    if (customFrom && customTo) load();
  };

  // Multi-select โรค (แบบแท็ก)
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  // ออปชันใน dropdown = เฉพาะโรคที่มีข้อมูลจริง
  const allDiseaseOptions = useMemo(() => {
    const keys = new Set([...Object.keys(refMap), ...Object.keys(formMap)]);
    return [...keys]
      .filter((k) => (refMap[k] || 0) + (formMap[k] || 0) > 0)
      .sort((a, b) => a.localeCompare(b, "th"));
  }, [refMap, formMap]);

  // labels
  const labels = useMemo(() => {
    const keys = new Set([...Object.keys(refMap), ...Object.keys(formMap)]);
    const all = [...keys].filter((k) => (refMap[k] || 0) + (formMap[k] || 0) > 0);
    if (selectedDiseases.length > 0) return selectedDiseases.filter((n) => all.includes(n));
    all.sort(
      (a, b) => (refMap[b] || 0) + (formMap[b] || 0) - ((refMap[a] || 0) + (formMap[a] || 0))
    );
    return all.slice(0, topN);
  }, [refMap, formMap, topN, selectedDiseases]);

  const rows = useMemo(
    () => labels.map((name) => ({
      name,
      guide: refMap[name] || 0,
      form: formMap[name] || 0,
      total: (refMap[name] || 0) + (formMap[name] || 0),
    })),
    [labels, refMap, formMap]
  );

  const totals = useMemo(() => {
    let g = 0, f = 0;
    for (const r of rows) { g += r.guide; f += r.form; }
    return { guide: g, form: f, all: g + f };
  }, [rows]);

  const hasForm = useMemo(() => Object.values(formMap).some((v) => (v || 0) > 0), [formMap]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const label = payload[0]?.payload?.name ?? "";
    const guide = payload.find((p: any) => p.dataKey === "guide")?.value ?? 0;
    const form = payload.find((p: any) => p.dataKey === "form")?.value ?? 0;

    const showGuide = sourceMode === "both" || sourceMode === "guide";
    const showForm  = (sourceMode === "both" || sourceMode === "form") && hasForm;

    return (
      <div className={styles.tooltipBox}>
        <div><strong>{label}</strong></div>
        {showGuide && <div>คัดกรองแนะนำ: <b>{Number(guide).toLocaleString()}</b></div>}
        {showForm  && <div>คัดกรองเคสจริง: <b>{Number(form).toLocaleString()}</b></div>}
        {(showGuide && showForm) && <div className={styles.tooltipDivider} />}
        {(showGuide && showForm) && (
          <div>รวม: <b>{(Number(guide) + Number(form)).toLocaleString()}</b></div>
        )}
      </div>
    );
  };

  const showGuideSeries = sourceMode === "both" || sourceMode === "guide";
  const showFormSeries  = (sourceMode === "both" || sourceMode === "form") && hasForm;

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContent}>
        {/* Title */}
        <div className={styles.header}>
          <h1 className={styles.title}>Total disease screening - ยอดรวมกันคัดกรองโรค</h1>
          <div className={styles.actions}></div>
        </div>

        {/* Toolbar */}
        <div className={styles.controlBar} role="group" aria-label="ตัวควบคุมแดชบอร์ด">
          {/* Left: chart modes + source modes */}
          <div className={styles.controlLeft}>
            <button
              type="button"
              {...ariaPressed(mode === "bar")}
              className={mode === "bar" ? styles.btnSelected : styles.btnChoice}
              onClick={() => setMode("bar")}
            >
              กราฟแท่ง
            </button>
            <button
              type="button"
              {...ariaPressed(mode === "line")}
              className={mode === "line" ? styles.btnSelected : styles.btnChoice}
              onClick={() => setMode("line")}
            >
              กราฟเส้น
            </button>

            <span className={styles.sep} aria-hidden="true" />
            <button
              type="button"
              {...ariaSelected(sourceMode === "guide")}
              className={sourceMode === "guide" ? styles.btnSelected : styles.btnChoice}
              onClick={() => setSourceMode("guide")}
            >
              คัดกรองแนะนำ
            </button>
            <button
              type="button"
              {...ariaSelected(sourceMode === "form")}
              className={sourceMode === "form" ? styles.btnSelected : styles.btnChoice}
              onClick={() => setSourceMode("form")}
            >
              คัดกรองเคสจริง
            </button>
            <button
              type="button"
              {...ariaSelected(sourceMode === "both")}
              className={sourceMode === "both" ? styles.btnSelected : styles.btnChoice}
              onClick={() => setSourceMode("both")}
            >
              รวม
            </button>
          </div>

          {/* Right: dates + reload + disease multiselect */}
          <div className={styles.controlRight}>
            <div className={styles.customRange}>
              <label htmlFor="fromDate" className={styles.srOnly}>วันที่เริ่ม</label>
              <input
                id="fromDate"
                type="date"
                className={styles.dateInput}
                aria-label="วันที่เริ่ม"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className={styles.toSep} aria-hidden="true">ถึง</span>
              <label htmlFor="toDate" className={styles.srOnly}>วันที่สิ้นสุด</label>
              <input
                id="toDate"
                type="date"
                className={styles.dateInput}
                aria-label="วันที่สิ้นสุด"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
              <button type="button" className={styles.btnApply} onClick={onApplyCustom}>
                ค้นหา
              </button>
            </div>

            <div className={styles.actionButtons}>
              <button type="button" onClick={load} className={styles.btnRefresh}>
                <RefreshCcw size={18} strokeWidth={1.5} /> โหลดใหม่
              </button>
            </div>

            <div className={styles.filterBox}>
              <TagMultiSelect
                options={allDiseaseOptions}
                values={selectedDiseases}
                onChange={setSelectedDiseases}
              />
              {selectedDiseases.length > 0 && (
                <button
                  type="button"
                  className={styles.btnChoice}
                  onClick={() => setSelectedDiseases([])}
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Totals under toolbar (ตาม sourceMode) */}
        <section className={styles.totalsSection} aria-live="polite">
          <div className={styles.totalsBox}>
            {(sourceMode === "guide" || sourceMode === "both") && (
              <div className={styles.totalItem}>
                <span>คัดกรองแนะนำ</span><b>{totals.guide.toLocaleString()}</b>
              </div>
            )}
            {(sourceMode === "form" || sourceMode === "both") && hasForm && (
              <div className={styles.totalItem}>
                <span>คัดกรองเคสจริง</span><b>{totals.form.toLocaleString()}</b>
              </div>
            )}
            {sourceMode === "both" && (
              <div className={styles.totalItemStrong}>
                <span>รวม</span><b>{totals.all.toLocaleString()}</b>
              </div>
            )}
          </div>
        </section>

        {/* Loading / Error */}
        {loading && <LoadingSpinner message="กำลังโหลดข้อมูล..." size={28} />}

        {error && (
          <div className={styles.statusBoxError} role="alert">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 12 }}
              className={styles.statusIcon}
              aria-hidden="true"
            >
              <XCircle size={24} strokeWidth={1.5} />
            </motion.div>
            <span>{error}</span>
          </div>
        )}

        {/* Chart + Table */}
        {!loading && !error && rows.length > 0 && (
          <>
            <div className={`${styles.chartWrapper} ${styles.chartWide} ${mode === "bar" ? styles.chartHBar : styles.chartHLine}`}>
              <ResponsiveContainer width="100%" height="100%">
                {mode === "bar" ? (
                  <BarChart data={rows} margin={{ top: 24, right: 20, bottom: 16, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 12, fill: "#111" }} />
                    <Tooltip content={<CustomTooltip />} />
                    {showGuideSeries && <Bar dataKey="guide" fill={C_REF} radius={[8, 8, 0, 0]} />}
                    {showFormSeries  && <Bar dataKey="form"  fill={C_FORM} radius={[8, 8, 0, 0]} />}
                  </BarChart>
                ) : (
                  <LineChart data={rows} margin={{ top: 24, right: 20, bottom: 16, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 12, fill: "#111" }} />
                    <Tooltip content={<CustomTooltip />} />
                    {showGuideSeries && (
                      <Line type="monotone" dataKey="guide" stroke={C_REF} strokeWidth={3} dot={{ r: 4 }} />
                    )}
                    {showFormSeries && (
                      <Line type="monotone" dataKey="form" stroke={C_FORM} strokeWidth={3} dot={{ r: 4 }} strokeDasharray="6 4" />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className={`${styles.tableWrapper} ${styles.tableWide}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>อาการ ({labels.length})</th>
                    {(sourceMode === "guide" || sourceMode === "both") && <th>คัดกรองแนะนำ</th>}
                    {(sourceMode === "form"  || sourceMode === "both") && <th>คัดกรองเคสจริง</th>}
                    {sourceMode === "both" && <th>รวม</th>}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((l) => (
                    <tr key={l}>
                      <td>{l}</td>
                      {(sourceMode === "guide" || sourceMode === "both") && <td>{refMap[l] || 0}</td>}
                      {(sourceMode === "form"  || sourceMode === "both") && <td>{formMap[l] || 0}</td>}
                      {sourceMode === "both" && <td>{(refMap[l] || 0) + (formMap[l] || 0)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className={styles.infoBox}>ยังไม่มีข้อมูลสำหรับการสรุปในช่วงเวลาที่เลือก</div>
        )}
      </main>
    </div>
  );
}
