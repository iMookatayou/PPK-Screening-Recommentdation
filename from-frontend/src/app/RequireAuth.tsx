'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token || !user) {
        router.push('/login');
      }
    }
  }, [loading, token, user, router]);

  if (loading) {
    return <p>กำลังโหลด...</p>;
  }

  if (!token || !user) {
    return <p>กำลังพาไปหน้าเข้าสู่ระบบ...</p>;
  }

  return <>{children}</>;
}
