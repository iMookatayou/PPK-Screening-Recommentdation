"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { authAxios } from "@/lib/axios";
import { clinicLabelMap } from "@/app/components/questionpath/clinicLabelMap";
import { ClipboardList, Search as IconSearch, CalendarRange } from "lucide-react";
import styles from "./styles/PatientHistory.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/app/components/ui/popup/ToastProvider";

/* ===================== Types ===================== */
type LiteItem = {
  case_id: string;
  name: string;
  created_at: string;              // "Y-m-d H:i:s"
  summary_clinics?: string[];
  symptoms?: string[];
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
  clinic?: string[];
  symptoms?: string[];
  note?: string | null;
  is_refer_case: boolean;
  type: "form" | "guide" | "referral" | "kiosk";
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
// Envelope
type ApiResp<T> = { code: string; message: string; data: T; errors?: unknown };

/* ===================== Utils ===================== */
function fmt(dt?: string) {
  if (!dt) return "—";
  const iso = dt.includes("T") ? dt : dt.replace(" ", "T");
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}
function clinicText(codes?: string[]) {
  if (!codes?.length) return "";
  return codes.map((c) => clinicLabelMap[c] || c).join(", ");
}
function guessLiteTitle(row: LiteItem) {
  if (row.symptoms?.length) return row.symptoms.slice(0, 2).join(", ");
  const ct = clinicText(row.summary_clinics);
  return ct || "ไม่ระบุ";
}
function displayGender(g?: string) {
  if (!g) return "—";
  const s = String(g).trim().toLowerCase();
  if (s === "1" || s === "m" || s === "male") return "ชาย";
  if (s === "2" || s === "f" || s === "female") return "หญิง";
  if (s === "3") return "ไม่ระบุ";
  if (s.includes("ชาย")) return "ชาย";
  if (s.includes("หญิง")) return "หญิง";
  return "ไม่ระบุ";
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
  show:   (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.16, delay: i * 0.02 } }),
};
const dividerVar = { hidden: { scaleX: 0, opacity: 0 }, show: { scaleX: 1, opacity: 1, transition: { duration: 0.25 } } };

/* ===================== Component ===================== */
export default function PatientHistory() {
  const { addToast } = useToast();

  const [cid, setCid] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [range, setRange] = useState<"" | "today" | "last_7d" | "last_30d" | "this_month">("");
  const [list, setList] = useState<LiteResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<DetailCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchingRef = useRef(false);

  const fetchHistory = useCallback(async (page = 1) => {
    if (fetchingRef.current) return;
    setError(null);

    const onlyDigits = cid.replace(/\D/g, "").slice(0, 13);
    if (!onlyDigits) {
      setError("กรุณากรอกเลขบัตรประชาชน (CID)");
      addToast({ type: "warning", message: "กรุณากรอก CID", position: "top-right" });
      return;
    }

    setLoading(true);
    setDetail(null);
    setSelected("");
    fetchingRef.current = true;

    try {
      const body: any = { cid: onlyDigits, page, per_page: 10 };
      if (range) body.range = range;
      else {
        if (start) body.start_date = start;
        if (end) body.end_date = end;
      }

      const res = await authAxios.post<ApiResp<{ items: LiteItem[]; meta: any }>>(
        "/patients/history",
        body,
        { signal: AbortSignal.timeout(15000) }
      );
      const normalized = normalizeHistoryPayload(res.data.data);
      setList(normalized);

      if (normalized.meta.total > 0) {
        addToast({ type: "success", message: `ค้นหาสำเร็จ: พบ ${normalized.meta.total} รายการ`, position: "top-right" });
      } else {
        addToast({ type: "info", message: "ไม่พบรายการ", position: "top-right" });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "โหลดข้อมูลล้มเหลว";
      setList(null);
      setError(msg);
      addToast({ type: "error", message: `ค้นหาล้มเหลว: ${msg}`, position: "top-right" });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [cid, range, start, end, addToast]);

  const pickCase = useCallback(async (case_id: string) => {
    setSelected(case_id);
    setDetail(null);
    if (!case_id) return;
    setDetailLoading(true);
    try {
      const res = await authAxios.post<ApiResp<DetailCase>>(
        "/form-ppk/show",
        { case_id },
        { signal: AbortSignal.timeout(15000) }
      );
      setDetail(res.data.data);
      addToast({ type: "success", message: "โหลดรายละเอียดเคสแล้ว", position: "top-right" });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "โหลดรายละเอียดล้มเหลว";
      setError(msg);
      addToast({ type: "error", message: `โหลดรายละเอียดล้มเหลว: ${msg}`, position: "top-right" });
    } finally {
      setDetailLoading(false);
    }
  }, [addToast]);

  const firstResultTime = useMemo(() => {
    const t = detail?.question_results?.[0]?.created_at;
    return t ? fmt(t) : "—";
  }, [detail]);

  const hasMoreThanOnePage = useMemo(() => (list?.meta?.last_page ?? 1) > 1, [list]);

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>
        <ClipboardList className={styles.titleIcon} aria-hidden />
        <span>ประวัติผู้ป่วยจากการคัดกรอง - Patient history from screening</span>
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
        <div className={styles.row}>
          <div className={styles.col4}>
            <label className={styles.label} htmlFor="cidInput">เลขบัตรประชาชน (CID)</label>
            <div className={styles.inputWithIcon}>
              <IconSearch className={styles.inputIcon} aria-hidden />
              <input
                id="cidInput"
                name="cid"
                className={styles.field}
                value={cid}
                onChange={(e) => setCid(e.target.value.replace(/\D/g, "").slice(0, 13))}
                placeholder="ค้นหาเลขบัตรประชาชน 13 หลัก"
                title="กรอกเลขบัตรประชาชน 13 หลัก"
                aria-label="เลขบัตรประชาชน"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className={styles.col3}>
            <label className={styles.label} htmlFor="rangeSelect">ช่วงเวลา</label>
            <div className={styles.inputWithIcon}>
              <CalendarRange className={styles.inputIcon} aria-hidden />
              <select
                id="rangeSelect"
                name="range"
                className={styles.field}
                value={range}
                onChange={(e) => { setRange(e.target.value as any); setStart(""); setEnd(""); }}
                title="เลือกช่วงวันที่สำเร็จรูป"
                aria-label="เลือกช่วงวันที่สำเร็จรูป"
              >
                <option value="">— เลือก —</option>
                <option value="today">วันนี้</option>
                <option value="last_7d">7 วันล่าสุด</option>
                <option value="last_30d">30 วันล่าสุด</option>
                <option value="this_month">เดือนนี้</option>
              </select>
            </div>
            <small className={styles.muted + " " + styles.block}>หรือเลือกวันเองด้านขวา</small>
          </div>

          <div className={styles.col3}>
            <label className={styles.label} htmlFor="startDate">วันที่เริ่ม</label>
            <input
              id="startDate"
              name="start_date"
              type="date"
              className={styles.field}
              value={start}
              onChange={(e) => { setRange(""); setStart(e.target.value); }}
              aria-label="วันที่เริ่มต้น"
              title="เลือกวันที่เริ่มต้น"
            />
          </div>

          <div className={styles.col2}>
            <label className={styles.label} htmlFor="endDate">วันที่สิ้นสุด</label>
            <input
              id="endDate"
              name="end_date"
              type="date"
              className={styles.field}
              value={end}
              onChange={(e) => { setRange(""); setEnd(e.target.value); }}
              aria-label="วันที่สิ้นสุด"
              title="เลือกวันที่สิ้นสุด"
            />
          </div>

          {/* ปุ่มค้นหา: sticky + ยืดตอน loading */}
            <div className={`${styles.col2} ${styles.alignEnd} ${styles.stickySearch}`}>
                <button
                    id="searchBtn"
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFixed}`}
                    onClick={() => fetchHistory(1)}
                    disabled={loading}
                    title="กดเพื่อค้นหาประวัติ"
                    aria-label="ค้นหา"
                >
                    <span className={styles.btnLabel} data-loading={loading ? "1" : "0"}>
                    <span className={styles.labelIdle}>ค้นหา</span>
                    <span className={styles.labelBusy}>กำลังค้นหา...</span>
                    </span>
                </button>
            </div>
        </div>
        {error && <div role="alert" className={styles.errorText}>{error}</div>}
      </motion.div>

      {/* List + select case */}
      <motion.div className={styles.card} variants={cardVar} initial="hidden" animate="show">
        <div className={styles.row}>
          <div className={styles.col12}>
            <label className={styles.label} htmlFor="caseSelect">เลือกเคส</label>
            <select
              id="caseSelect"
              name="case_id"
              className={styles.field}
              value={selected}
              onChange={(e) => pickCase(e.target.value)}
              aria-label="เลือกเคสจากรายการ"
              title="เลือกเคสจากรายการ"
            >
              <option value="">— เลือกเคส —</option>
              {list?.data?.map((row) => (
                <option key={row.case_id} value={row.case_id}>
                  {fmt(row.created_at)} • {guessLiteTitle(row)}
                </option>
              ))}
            </select>
            {!list?.data?.length && (
              <div className={styles.muted} id="emptyListMsg">
                ยังไม่มีรายการ (กรุณาค้นหาก่อน)
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ตารางสรุป */}
      <motion.div className={styles.card} variants={cardVar} initial="hidden" animate="show">
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="ตารางประวัติผู้ป่วย">
            <thead>
              <tr>
                <th className={styles.colNo}>ลำดับ</th>
                <th>วันที่/เวลา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>โรค/อาการหลัก</th>
                <th>คลินิก</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {list?.data?.length ? (
                  list.data.map((row, i) => (
                    <motion.tr
                      key={row.case_id}
                      custom={i}
                      variants={rowVar}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0 }}
                    >
                      <td>{i + 1}</td>
                      <td>{fmt(row.created_at)}</td>
                      <td>{row.name}</td>
                      <td>{guessLiteTitle(row)}</td>
                      <td>{clinicText(row.summary_clinics) || "—"}</td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>
                      ไม่มีข้อมูล — กรอก CID แล้วกดค้นหา
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {(list?.meta?.last_page ?? 1) > 1 && (
          <div className={styles.pagination} role="navigation" aria-label="เปลี่ยนหน้า">
            {Array.from({ length: list?.meta?.last_page ?? 1 }).map((_, idx) => {
              const active = (list?.meta?.current_page ?? 1) === (idx + 1);
              return (
                <button
                  key={idx}
                  className={[
                    styles.btn,
                    styles.pageBtn,
                    active ? styles.pageBtnActive : "",
                  ].join(" ")}
                  onClick={() => fetchHistory(idx + 1)}
                  title={`ไปหน้าที่ ${idx + 1}`}
                  aria-label={`ไปหน้าที่ ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* สรุปผู้ป่วย + เวลาคัดกรองแรก + รายละเอียดการประเมิน */}
      <motion.div className={styles.card} variants={cardVar} initial="hidden" animate="show" aria-live="polite">
        <div className={styles.sectionTitle}>รายละเอียดเคสที่เลือก</div>
        {!selected && <div className={styles.muted}>ยังไม่ได้เลือกเคส</div>}
        {detailLoading && <div className={styles.muted}>กำลังโหลดรายละเอียด…</div>}

        {detail && (
          <>
            <div className={styles.grid2}>
              <div><b>ชื่อ:</b> {detail.name}</div>
              <div><b>CID:</b> {detail.cid}</div>
              <div><b>อายุ/เพศ:</b> {detail.age} / {displayGender(detail.gender)}</div>
              <div><b>สิทธิ/รพ.หลัก:</b> {detail.maininscl_name || "—"} / {detail.hmain_name || "—"}</div>
              <div><b>เวลาสร้างเคส:</b> {fmt(detail.created_at)}</div>
            </div>

            <div className={styles.blockTop}>
              <div className={styles.sectionTitle}>เวลาคัดกรอง (รายการแรก)</div>
              <div>{firstResultTime}</div>
            </div>

            <motion.hr className={styles.hr} variants={dividerVar} initial="hidden" animate="show" />

            <div className={styles.blockTop}>
              <div className={styles.sectionTitle}>รายละเอียดการประเมิน ({detail.question_results.length})</div>

              <AnimatePresence initial={false}>
                {detail.question_results.map((qr, i) => (
                  <motion.div
                    key={i}
                    className={styles.qrItem}
                    custom={i}
                    variants={rowVar}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0 }}
                  >
                    <div><b>{qr.question_title || qr.question}</b></div>
                    <div className={styles.muted}>
                      {fmt(qr.created_at)} • {qr.type.toUpperCase()} {qr.is_refer_case ? "• REFER" : ""}
                    </div>
                    <div>
                      <b>คลินิก:</b>{" "}
                      {(Array.isArray(qr.clinic) ? qr.clinic : [])
                        .map((c) => clinicLabelMap[c] || c)
                        .join(", ") || "—"}
                      {qr.symptoms?.length ? <> • <b>อาการ:</b> {qr.symptoms.join(", ")}</> : null}
                      {qr.note ? <> • <b>หมายเหตุ:</b> {qr.note}</> : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
