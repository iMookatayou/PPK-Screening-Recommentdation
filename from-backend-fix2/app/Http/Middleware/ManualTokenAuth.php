<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;   // ใช้ Schema facade
use Laravel\Sanctum\PersonalAccessToken;
use Carbon\Carbon;

class ManualTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        $tz = config('app.timezone', 'Asia/Bangkok');

        $tokenString = $request->bearerToken();
        if (!$tokenString) {
            return response()->json([
                'message' => 'ไม่ได้ส่ง Token มา กรุณาเข้าสู่ระบบก่อน',
                'code'    => 'TOKEN_MISSING',
            ], 401);
        }

        $accessToken = PersonalAccessToken::findToken($tokenString);

        if (!$accessToken) {
            return response()->json([
                'message' => 'Token ไม่ถูกต้องหรือหมดอายุ',
                'code'    => 'TOKEN_INVALID',
            ], 401);
        }

        $now = Carbon::now($tz);
        if ($accessToken->expires_at && $accessToken->expires_at->lt($now)) {
            return response()->json([
                'message'    => 'Token หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่',
                'code'       => 'TOKEN_EXPIRED',
                'expired_at' => $accessToken->expires_at->timezone($tz)->toDateTimeString(),
            ], 401);
        }

        $user = $accessToken->tokenable;
        if (!$user) {
            return response()->json([
                'message' => 'ไม่พบผู้ใช้งานที่เกี่ยวข้องกับ Token นี้',
                'code'    => 'USER_NOT_FOUND',
            ], 401);
        }

        if ($user->status !== 'approved') {
            return response()->json([
                'message' => $user->status === 'pending'
                    ? 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ'
                    : 'บัญชีถูกปฏิเสธการอนุมัติ',
                'code'    => $user->status === 'pending' ? 'PENDING' : 'REJECTED',
            ], 403);
        }

        // อัปเดต last_used_at ถ้ามีคอลัมน์นี้
        try {
            if (Schema::hasColumn($accessToken->getTable(), 'last_used_at')) {
                $accessToken->forceFill(['last_used_at' => $now])->saveQuietly();
            }
        } catch (\Throwable $e) {
            // เงียบ ๆ ไป ไม่ให้กระทบ flow auth
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
