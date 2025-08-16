<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TokenExpirationCheck
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token && $token->expires_at) {
            if (now()->greaterThanOrEqualTo($token->expires_at)) {
                return response()->json([
                    'message'    => 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                    'code'       => 'TOKEN_EXPIRED',
                    'expired_at' => $token->expires_at->toDateTimeString(),
                ], 401);
            }
        }

        return $next($request);
    }
}
