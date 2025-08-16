'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Search, Users, RotateCcw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/app/components/ui/popup/ToastProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from './styles/AdminUsers.module.css';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { authAxios } from '@/lib/axios';

type Status = 'pending' | 'approved' | 'rejected';
type StatusFilter = 'all' | Status;

interface AdminUser {
  id: number;
  cid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: Status;
  created_at: string;
  rejected_reason?: string | null;
  reapply_allowed?: boolean;
  reapply_until?: string | null;
  rejected_at?: string | null;
}

interface ApiResponse {
  data: AdminUser[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
  counts?: { all: number; pending: number; approved: number; rejected: number };
}

const PER_PAGE = 20;

function formatDateThai(iso?: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [meta, setMeta] = useState<ApiResponse['meta'] | null>(null);
  const [counts, setCounts] = useState<ApiResponse['counts'] | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  // Modal ปฏิเสธ
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal อนุญาตสมัครใหม่
  const [reapplyOpen, setReapplyOpen] = useState(false);
  const [reapplyTargetId, setReapplyTargetId] = useState<number | null>(null);
  const [reapplyDays, setReapplyDays] = useState<number>(30);

  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const canPrev = !!meta?.current_page && meta.current_page > 1;
  const canNext = !!meta?.current_page && !!meta?.last_page && meta.current_page < meta.last_page;

  const fetchUsers = useCallback(
    async (opts?: { page?: number; q?: string; status?: StatusFilter }) => {
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const nextStatus = opts?.status ?? statusFilter; // ★
        const res = await authAxios.get<ApiResponse>('/admin/users', {
          params: {
            page: opts?.page ?? page,
            per_page: PER_PAGE,
            q: (opts?.q ?? q) || undefined,
            status: nextStatus === 'all' ? undefined : nextStatus, // ★ อย่าส่ง 'all'
          },
          signal: controller.signal,
        });
        setUsers(res.data.data);
        setMeta(res.data.meta);
        if (res.data.counts) setCounts(res.data.counts);

        // ★ แจ้งให้ปุ่มแอดมินรีเฟรชเลข badge
        window.dispatchEvent(new Event('admin-pending-refresh'));
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          router.replace('/unauthorized');
          return;
        }
        const msg = err?.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ';
        addToast({ type: 'error', message: msg, position: 'top-right' });
      } finally {
        setLoading(false);
      }
    },
    [page, q, statusFilter, addToast, router]
  );

  // Actions
  const doAction = useCallback(
    async (
      id: number,
      action: 'approve' | 'reject' | 'allow-reapply' | 'block-reapply',
      payload?: any
    ) => {
      setActingId(id);
      const prev = [...users]; // ★ clone เพื่อ rollback ปลอดภัย
      const prevLength = prev.length; // ★ เก็บความยาวก่อนลบไว้คำนวณหน้า
      // optimistic remove แถว
      setUsers((curr) => curr.filter((u) => u.id !== id));

      try {
        let url = `/admin/users/${id}/`;
        if (action === 'allow-reapply') url += 'allow-reapply';
        else if (action === 'block-reapply') url += 'block-reapply';
        else url += action; // approve | reject

        await authAxios.put(url, payload);

        let okMsg = 'ดำเนินการสำเร็จ';
        if (action === 'approve') okMsg = 'อนุมัติแล้ว';
        if (action === 'reject') okMsg = 'ปฏิเสธแล้ว';
        if (action === 'allow-reapply') okMsg = 'อนุญาตให้สมัครใหม่แล้ว';
        if (action === 'block-reapply') okMsg = 'ปิดสิทธิ์สมัครใหม่แล้ว';

        addToast({ type: 'success', message: okMsg, position: 'top-right' });

        // ★ ถ้าแถวในหน้าก่อนลบเหลือ 1 และมีหลายหน้า → ถอยหน้าลง
        const nextPage = prevLength === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) setPage(nextPage);

        // ★ แจ้งให้ badge รีเฟรชทันที
        window.dispatchEvent(new Event('admin-pending-refresh'));

        fetchUsers({ page: nextPage, q, status: statusFilter });
      } catch (err: any) {
        const code = err?.response?.data?.code;
        const message = err?.response?.data?.message;
        if (code === 'USE_REAPPLY_FLOW') {
          addToast({
            type: 'info',
            message:
              message ||
              'ผู้ใช้รายนี้ถูกปฏิเสธแล้ว ควรใช้ “อนุญาตให้สมัครใหม่” แทนการอนุมัติซ้ำ',
            position: 'top-right',
          });
        } else {
          const msg = message || err?.message || 'ดำเนินการไม่สำเร็จ';
          addToast({ type: 'error', message: msg, position: 'top-right' });
        }
        // rollback
        setUsers(prev); // ★
      } finally {
        setActingId(null);
      }
    },
    [users, page, q, statusFilter, addToast, fetchUsers]
  );

  // Handlers
  const handleApprove = (u: AdminUser) => {
    if (u.status === 'rejected') {
      setReapplyTargetId(u.id);
      setReapplyDays(30);
      setReapplyOpen(true);
      addToast({
        type: 'info',
        message: 'ผู้ใช้นี้ถูกปฏิเสธแล้ว — ใช้ “อนุญาตให้สมัครใหม่” แทน',
        position: 'top-right',
      });
      return;
    }
    doAction(u.id, 'approve');
  };

  const openReject = (id: number) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = () => {
    if (rejectTargetId == null) return;
    const payload = rejectReason.trim() ? { reason: rejectReason.trim() } : undefined;
    doAction(rejectTargetId, 'reject', payload);
    setRejectOpen(false);
    setRejectTargetId(null);
    setRejectReason('');
  };

  const cancelReject = () => {
    setRejectOpen(false);
    setRejectTargetId(null);
    setRejectReason('');
  };

  const openAllowReapply = (id: number) => {
    setReapplyTargetId(id);
    setReapplyDays(30);
    setReapplyOpen(true);
  };

  const confirmAllowReapply = () => {
    if (reapplyTargetId == null) return;
    const payload =
      Number.isFinite(reapplyDays) && reapplyDays > 0 ? { allow_days: reapplyDays } : {};
    doAction(reapplyTargetId, 'allow-reapply', payload);
    setReapplyOpen(false);
    setReapplyTargetId(null);
  };

  const cancelAllowReapply = () => {
    setReapplyOpen(false);
    setReapplyTargetId(null);
  };

  const blockReapply = (id: number) => {
    doAction(id, 'block-reapply');
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers({ page: 1, q, status: statusFilter });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/unauthorized');
      return;
    }
    setPage(1);
    fetchUsers({ page: 1, q, status: statusFilter });
    // optional cleanup: ยกเลิกเรียกที่ค้างเมื่อ unmount
    return () => abortRef.current?.abort();
  }, [user, authLoading, statusFilter, fetchUsers, router]);

  if (authLoading) return <LoadingSpinner message="กำลังตรวจสิทธิ์..." />;
  if (!user || user.role !== 'admin') return null;

  const badge = (label: string, value: number | string, key: StatusFilter, extraClass?: string) => (
    <button
      type="button"
      onClick={() => {
        setStatusFilter(key);
        setPage(1);
      }}
      className={[styles.badge, extraClass || '', statusFilter === key ? styles.badgeSelected : ''].join(' ')}
    >
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>
          <Users size={18} /> User Permission
        </h1>

        <form onSubmit={onSearch} className={styles.searchForm} role="search" aria-label="ค้นหาผู้ใช้">
          <label htmlFor="userSearch" style={srOnly}>ค้นหาผู้ใช้</label>
          <input
            id="userSearch"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อ, อีเมล หรือเลขบัตร"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className={styles.searchBtn} type="submit" disabled={loading} aria-label="ค้นหา">
            <Search size={16} /> ค้นหา
          </button>
        </form>
      </div>

      <div className={styles.summary}>
        {badge('ทั้งหมด', counts?.all ?? meta?.total ?? 0, 'all')}
        {badge('รออนุมัติ', counts?.pending ?? '-', 'pending', styles.badgeWarn)}
        {badge('อนุมัติแล้ว', counts?.approved ?? '-', 'approved', styles.badgeOk)}
        {badge('ปฏิเสธ', counts?.rejected ?? '-', 'rejected', styles.badgeDanger)}
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <LoadingSpinner message="กำลังโหลดข้อมูลผู้ใช้งาน..." />
          </motion.div>
        ) : users.length === 0 ? (
          <p className={styles.empty}>ไม่พบผู้ใช้งานในหมวดนี้</p>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thName}>ชื่อ - นามสกุล</th>
                    <th className={styles.thEmail}>อีเมล</th>
                    <th className={styles.thCid}>เลขบัตร</th>
                    <th className={styles.thCreated}>วันที่สมัคร</th>
                    <th className={styles.thStatus}>สถานะ</th>
                    <th className={styles.thActions}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const disabled = actingId === u.id;
                    const canApprove = u.status === 'pending';
                    const canReject = u.status !== 'rejected';
                    const isRejected = u.status === 'rejected';

                    const rejectTitle =
                      isRejected && u.rejected_reason
                        ? `เหตุผลการปฏิเสธ: ${u.rejected_reason}`
                        : undefined;

                    const reapplyInfo =
                      isRejected
                        ? u.reapply_allowed
                          ? `เปิดให้สมัครใหม่ถึง ${formatDateThai(u.reapply_until || undefined)}`
                          : 'ยังไม่อนุญาตให้สมัครใหม่'
                        : '';

                    return (
                      <tr key={u.id} title={rejectTitle}>
                        <td className={styles.tdName}>{u.first_name} {u.last_name}</td>
                        <td className={styles.tdEmail}>{u.email || '-'}</td>
                        <td className={styles.cid}>{u.cid}</td>
                        <td className={styles.tdCreated}>{formatDateThai(u.created_at)}</td>
                        <td className={styles.tdStatus}>
                          <div>
                            <span className={styles[`status_${u.status}`]}>
                              {u.status === 'pending'
                                ? 'รออนุมัติ'
                                : u.status === 'approved'
                                ? 'อนุมัติแล้ว'
                                : 'ถูกปฏิเสธ'}
                            </span>
                            {isRejected && (
                              <div className={styles.subNote}>
                                {reapplyInfo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={styles.actions}>
                          {canApprove && (
                            <button
                              type="button"
                              className={styles.approveBtn}
                              onClick={() => handleApprove(u)}
                              disabled={disabled}
                              aria-label={`อนุมัติผู้ใช้ ${u.first_name} ${u.last_name}`}
                            >
                              <CheckCircle size={16} />
                              อนุมัติ
                            </button>
                          )}

                          {isRejected && (
                            <>
                              <button
                                type="button"
                                className={styles.approveBtn}
                                onClick={() => openAllowReapply(u.id)}
                                disabled={disabled}
                                aria-label={`อนุญาตให้สมัครใหม่ ผู้ใช้ ${u.first_name} ${u.last_name}`}
                                title="อนุญาตให้สมัครใหม่"
                              >
                                <RotateCcw size={16} />
                                อนุญาตสมัครใหม่
                              </button>
                              {u.reapply_allowed && (
                                <button
                                  type="button"
                                  className={styles.rejectBtn}
                                  onClick={() => blockReapply(u.id)}
                                  disabled={disabled}
                                  aria-label={`ปิดสิทธิ์สมัครใหม่ ผู้ใช้ ${u.first_name} ${u.last_name}`}
                                  title="ปิดสิทธิ์สมัครใหม่"
                                >
                                  <XCircle size={16} />
                                  ปิดสิทธิ์สมัครใหม่
                                </button>
                              )}
                            </>
                          )}

                          {canReject && (
                            <button
                              type="button"
                              className={styles.rejectBtn}
                              onClick={() => openReject(u.id)}
                              disabled={disabled}
                              aria-label={`ปฏิเสธผู้ใช้ ${u.first_name} ${u.last_name}`}
                            >
                              <XCircle size={16} /> ปฏิเสธ
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta && (
              <div className={styles.pager}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => {
                    const newPage = Math.max(1, meta.current_page - 1);
                    setPage(newPage);
                    fetchUsers({ page: newPage, q, status: statusFilter });
                  }}
                  disabled={!canPrev || loading}
                >
                  ก่อนหน้า
                </button>
                <span className={styles.pageInfo}>
                  หน้า {meta.current_page} / {meta.last_page} (ทั้งหมด {meta.total} รายการ)
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => {
                    const newPage = meta.current_page + 1;
                    setPage(newPage);
                    fetchUsers({ page: newPage, q, status: statusFilter });
                  }}
                  disabled={!canNext || loading}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== Modal: ปฏิเสธ ===== */}
      {rejectOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejectTitle"
          aria-describedby="rejectHelp"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={cancelReject}
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 92vw)',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              padding: 20,
            }}
          >
            <h3 id="rejectTitle" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              ปฏิเสธการอนุมัติผู้ใช้งาน
            </h3>
            <p id="rejectHelp" style={{ marginTop: 8, color: '#334155', fontSize: 14 }}>
              โปรดระบุเหตุผล (ไม่ระบุก็ได้) แล้วกด <b>ยืนยันการปฏิเสธ</b>
            </p>

            <label htmlFor="rejectReason" style={{ display: 'block', fontSize: 14, marginTop: 8, color: '#111827' }}>
              เหตุผลการปฏิเสธ
            </label>
            <textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="เช่น ข้อมูลไม่ครบถ้วน / ใช้อีเมลองค์กรไม่ถูกต้อง"
              aria-describedby="rejectHelp"
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelReject}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReject}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 0,
                  background: '#dc2626',
                  color: '#fff',
                }}
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: อนุญาตสมัครใหม่ ===== */}
      {reapplyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reapplyTitle"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={cancelAllowReapply}
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 92vw)',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              padding: 20,
            }}
          >
            <h3 id="reapplyTitle" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              อนุญาตให้สมัครใหม่
            </h3>
            <p style={{ marginTop: 8, color: '#334155', fontSize: 14 }}>
              ระบุจำนวนวันสำหรับสิทธิ์การสมัครใหม่ (เช่น 30 วัน) หรือปล่อยว่างเพื่ออนุญาตโดยไม่กำหนดวันหมดสิทธิ์
            </p>

            <label htmlFor="reapplyDays" style={{ display: 'block', fontSize: 14, marginTop: 8, color: '#111827' }}>
              จำนวนวัน (เว้นว่างได้)
            </label>
            <input
              id="reapplyDays"
              type="number"
              min={1}
              placeholder="30"
              value={Number.isFinite(reapplyDays) ? reapplyDays : ('' as any)}
              onChange={(e) => {
                const v = e.target.value === '' ? NaN : parseInt(e.target.value, 10);
                setReapplyDays(Number.isNaN(v) ? (NaN as any) : v);
              }}
              style={{
                width: '120px',
                marginTop: 6,
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 14,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelAllowReapply}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmAllowReapply}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 0,
                  background: '#2563eb',
                  color: '#fff',
                }}
              >
                อนุญาตสมัครใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
