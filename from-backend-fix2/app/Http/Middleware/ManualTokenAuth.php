<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Carbon\Carbon;

class ManualTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        // ดึง token จาก Authorization header
        $tokenString = $request->bearerToken();

        if (!$tokenString) {
            return response()->json([
                'message' => 'คุณยังไม่ได้เข้าสู่ระบบ กรุณา login ก่อนใช้งาน'
            ], 401);
        }

        // ✅ ถ้า token เป็นแบบ "1|plain_token" → ตัดเฉพาะส่วนหลัง '|'
        if (str_contains($tokenString, '|')) {
            [$id, $tokenPlain] = explode('|', $tokenString, 2);
        } else {
            $tokenPlain = $tokenString;
        }

        // เช็ค token ในฐานข้อมูล (hash + ตรวจวันหมดอายุ)
        $now = Carbon::now();
        $accessToken = PersonalAccessToken::where('token', hash('sha256', $tokenPlain))
            ->where(function ($query) use ($now) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', $now);
            })
            ->first();

        if (!$accessToken || !$accessToken->tokenable) {
            return response()->json([
                'message' => 'Token ไม่ถูกต้อง หรือผู้ใช้งานไม่พบในระบบ'
            ], 401);
        }

        // Auth success
        Auth::setUser($accessToken->tokenable);
        $request->setUserResolver(fn () => $accessToken->tokenable);

        return $next($request);
    }
}
