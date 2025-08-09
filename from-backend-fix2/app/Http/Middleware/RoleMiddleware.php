<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * ใช้แบบ:
     *   ->middleware('role:admin')                 // บทบาทเดียว
     *   ->middleware('role:admin,user')           // อย่างน้อยหนึ่งในหลายบทบาท
     */
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();

        // ยังไม่ authenticate
        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized: กรุณาเข้าสู่ระบบก่อน',
                'code'    => 'UNAUTHORIZED',
            ], 401);
        }

        // แปลง "admin,user" → ['admin','user']
        $allowed = collect(explode(',', $roles))
            ->map(fn ($r) => strtolower(trim($r)))
            ->filter()
            ->values()
            ->all();

        // ไม่มีบทบาทส่งมา -> ปล่อยผ่าน (กัน config พลาด)
        if (empty($allowed)) {
            return $next($request);
        }

        $currentRole = strtolower((string) $user->role);

        // ถ้าตรงบทบาทอย่างน้อยหนึ่ง → ผ่าน
        if (in_array($currentRole, $allowed, true)) {
            return $next($request);
        }

        // ไม่ตรงสิทธิ
        return response()->json([
            'message' => 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้',
            'code'    => 'FORBIDDEN',
            'required_roles' => $allowed,
            'your_role'      => $currentRole,
        ], 403);
    }
}
