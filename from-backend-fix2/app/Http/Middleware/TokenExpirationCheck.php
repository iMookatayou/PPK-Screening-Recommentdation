<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Carbon\Carbon;

class TokenExpirationCheck
{
    /**
     * ตรวจสอบว่า Token หมดอายุหรือยัง (เทียบกับ timezone ระบบ)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tz = config('app.timezone', 'Asia/Bangkok');

        // ต้องมั่นใจว่า ManualTokenAuth เรียกก่อน middleware ตัวนี้
        $token = $request->user()?->currentAccessToken();

        if ($token && $token->expires_at) {
            $now       = Carbon::now($tz);
            $expiresAt = $token->expires_at->timezone($tz);

            if ($now->gte($expiresAt)) {
                return response()->json([
                    'message'    => 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                    'code'       => 'TOKEN_EXPIRED',
                    'expired_at' => $expiresAt->toDateTimeString(),
                ], 401);
            }
        }

        return $next($request);
    }
}
