// AdminUsersPage.tsx

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/axios';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/app/components/ui/ToastProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from './styles/AdminUsers.module.css';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

type Status = 'pending' | 'approved' | 'rejected';

interface PendingUser {
  id: number;
  cid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: Status;
  created_at: string;
}

interface PendingResponse {
  data: PendingUser[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

const PER_PAGE = 20;

function formatDateThai(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [serverMeta, setServerMeta] = useState<PendingResponse['meta'] | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const { token, user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const canPrev = serverMeta?.current_page && serverMeta.current_page > 1;
  const canNext = serverMeta?.current_page && serverMeta?.last_page && serverMeta.current_page < serverMeta.last_page;

  const fetchUsers = useCallback(async (opts?: { page?: number; q?: string }) => {
    if (!token) return;
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.get<PendingResponse>('/admin/users/pending', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: opts?.page ?? page,
          per_page: PER_PAGE,
          q: (opts?.q ?? q) || undefined,
        },
        signal: controller.signal,
      });

      setUsers(res.data.data);
      setServerMeta(res.data.meta);
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        router.replace('/unauthorized');
        return;
      }
      addToast({
        type: 'error',
        message: 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้',
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  }, [token, page, q, addToast, router]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!token) return;

    let payload: any = null;
    if (action === 'reject') {
      const reason = window.prompt('กรุณาระบุเหตุผลการปฏิเสธ (เว้นว่างได้)');
      payload = reason ? { reason } : null;
    }

    setActingId(id);
    const prev = users;
    setUsers((curr) => curr.filter((u) => u.id !== id));

    try {
      await api.put(`/admin/users/${id}/${action}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addToast({
        type: 'success',
        message: action === 'approve' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธเรียบร้อย',
        position: 'top-right',
      });

      if (users.length === 1 && page > 1) {
        const newPage = page - 1;
        setPage(newPage);
        fetchUsers({ page: newPage, q });
      } else {
        fetchUsers({ page, q });
      }
    } catch (err) {
      setUsers(prev);
      addToast({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการดำเนินการ',
        position: 'top-right',
      });
    } finally {
      setActingId(null);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers({ page: 1, q });
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'admin') {
      router.replace('/unauthorized');
      return;
    }

    fetchUsers({ page: 1, q: '' });
  }, [user, authLoading, token, fetchUsers, router]);

  if (authLoading) {
    return <LoadingSpinner message="กำลังโหลดสิทธิ์ผู้ใช้งาน..." />;
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <div className={styles.contentBox}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>User Permission</h1>
          <form onSubmit={onSearch} className={styles.searchForm}>
            <input
              className={styles.searchInput}
              placeholder="ค้นหาชื่อ, นามสกุล, อีเมล หรือเลขบัตร"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search users"
            />
            <button className={styles.searchBtn} type="submit" disabled={loading} aria-label="ค้นหา">
              <Search size={16} />
              ค้นหา
            </button>
          </form>
        </div>

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <LoadingSpinner message="กำลังโหลดข้อมูลผู้ใช้งาน..." />
          </motion.div>
        ) : users.length === 0 ? (
          <p className={styles.empty}>ไม่มีผู้ใช้งานที่รออนุมัติ</p>
        ) : (
          <>
            <motion.table
              className={styles.table}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>นามสกุล</th>
                  <th>อีเมล</th>
                  <th>เลขบัตร</th>
                  <th>วันที่สมัคร</th>
                  <th>สถานะ</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const disabled = actingId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.first_name}</td>
                      <td>{u.last_name}</td>
                      <td>{u.email || '-'}</td>
                      <td className={styles.cid}>{u.cid}</td>
                      <td>{formatDateThai(u.created_at)}</td>
                      <td>
                        <span className={styles[`status_${u.status}`]}>
                          {u.status === 'pending'
                            ? 'รออนุมัติ'
                            : u.status === 'approved'
                            ? 'อนุมัติแล้ว'
                            : 'ถูกปฏิเสธ'}
                        </span>
                      </td>
                      <td className={styles.actions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleAction(u.id, 'approve')}
                          disabled={disabled}
                          aria-label="อนุมัติผู้ใช้"
                        >
                          <CheckCircle size={16} />
                          อนุมัติ
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleAction(u.id, 'reject')}
                          disabled={disabled}
                          aria-label="ปฏิเสธผู้ใช้"
                        >
                          <XCircle size={16} />
                          ปฏิเสธ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </motion.table>

            {serverMeta && (
              <div className={styles.pager}>
                <button
                  className={styles.pageBtn}
                  onClick={() => {
                    const newPage = Math.max(1, serverMeta.current_page - 1);
                    setPage(newPage);
                    fetchUsers({ page: newPage, q });
                  }}
                  disabled={!canPrev || loading}
                  aria-label="ก่อนหน้า"
                >
                  ก่อนหน้า
                </button>
                <span className={styles.pageInfo}>
                  หน้า {serverMeta.current_page} / {serverMeta.last_page} (ทั้งหมด {serverMeta.total} รายการ)
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => {
                    const newPage = serverMeta.current_page + 1;
                    setPage(newPage);
                    fetchUsers({ page: newPage, q });
                  }}
                  disabled={!canNext || loading}
                  aria-label="ถัดไป"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
