<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\PersonalAccessToken;

class ManualTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        //Bearer token
        $plain = $request->bearerToken();
        if (!$plain) {
            return response()->json([
                'message' => 'ไม่ได้ส่ง Token มา กรุณาเข้าสู่ระบบก่อน',
                'code'    => 'TOKEN_MISSING',
            ], 401);
        }

        //token record
        $token = PersonalAccessToken::findToken($plain);
        if (!$token) {
            return response()->json([
                'message' => 'Token ไม่ถูกต้องหรือหมดอายุ',
                'code'    => 'TOKEN_INVALID',
            ], 401);
        }

        //cache schema flag
        static $hasRevokedCol, $hasRevokedReasonCol, $hasRevokedAtCol, $hasLastUsedAtCol, $hasDeviceLabelCol;
        if ($hasRevokedCol === null) {
            $table = $token->getTable();
            $hasRevokedCol        = Schema::hasColumn($table, 'revoked');
            $hasRevokedReasonCol  = Schema::hasColumn($table, 'revoked_reason');
            $hasRevokedAtCol      = Schema::hasColumn($table, 'revoked_at');
            $hasLastUsedAtCol     = Schema::hasColumn($table, 'last_used_at');
            $hasDeviceLabelCol    = Schema::hasColumn($table, 'device_label');
        }

        //revoked / replaced
        if ($hasRevokedCol && ($token->revoked ?? false)) {
            $reason = $hasRevokedReasonCol ? ($token->revoked_reason ?? 'REVOKED') : 'REVOKED';
            $code   = $reason === 'REPLACED' ? 'TOKEN_REPLACED' : 'TOKEN_REVOKED';

            $payload = [
                'message' => $reason === 'REPLACED'
                    ? 'บัญชีของคุณถูกเข้าสู่ระบบจากอุปกรณ์อื่น จึงถูกบังคับออกจากระบบ'
                    : 'Token ถูกเพิกถอนแล้ว',
                'code'    => $code,
            ];

            if ($hasRevokedAtCol && $token->revoked_at) {
                $payload['at'] = $token->revoked_at->toDateTimeString();
            }
            if ($hasDeviceLabelCol && !empty($token->device_label)) {
                $payload['by'] = (string) $token->device_label; 
            }

            return response()->json($payload, 401);
        }

        // ----- 5) ตรวจวันหมดอายุ
        if ($token->expires_at && now()->greaterThan($token->expires_at)) {
            return response()->json([
                'message'    => 'Token หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่',
                'code'       => 'TOKEN_EXPIRED',
                'expired_at' => $token->expires_at->toDateTimeString(),
            ], 401);
        }

        //ดึงผู้ใช้ & ตรวจสถานะ
        $user = $token->tokenable;
        if (!$user) {
            return response()->json([
                'message' => 'ไม่พบผู้ใช้งานที่เกี่ยวข้องกับ Token นี้',
                'code'    => 'USER_NOT_FOUND',
            ], 401);
        }

        if (($user->status ?? null) !== 'approved') {
            return response()->json([
                'message' => $user->status === 'pending'
                    ? 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ'
                    : 'บัญชีถูกปฏิเสธการอนุมัติ',
                'code'    => $user->status === 'pending' ? 'PENDING' : 'REJECTED',
            ], 403);
        }

        //last_used_at
        if ($hasLastUsedAtCol) {
            $token->forceFill(['last_used_at' => now()])->saveQuietly();
        }

        //bind user + token
        $authUser = $user->withAccessToken($token);
        Auth::setUser($authUser);
        $request->setUserResolver(fn () => $authUser);

        //token object เผื่อ middleware
        $request->attributes->set('sanctum_token', $token);

        return $next($request); 
    }
}
