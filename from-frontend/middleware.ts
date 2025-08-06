import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/register'];

  // ✅ ถ้าเป็นหน้า public ให้ผ่าน
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    // ✅ เรียก Laravel /me พร้อมแนบ cookie เดิมจาก request
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || ''
      },
      cache: 'no-store',
    });

    // ❌ ถ้าไม่ได้ login → redirect
    if (res.status === 401) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (err) {
    console.error('[MIDDLEWARE ERROR]', err);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ ผ่านได้
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
