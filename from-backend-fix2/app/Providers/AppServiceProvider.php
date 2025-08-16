<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ----- ล็อกอิน -----
        RateLimiter::for('auth-login', function (Request $request) {
            $cid = (string) $request->input('cid', 'no-cid');
            return [
                Limit::perMinute(5)->by($request->ip().'|'.$cid)
                    ->response(function ($request, $headers) {
                        $retry = (int)($headers['Retry-After'] ?? 60);
                        return response()->json([
                            'message'     => "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน {$retry} วินาที",
                            'code'        => 'RATE_LIMIT',
                            'retry_after' => $retry,
                        ], 429, $headers);
                    }),
            ];
        });

        // ----- สมัครสมาชิก (ถ้าใช้) -----
        RateLimiter::for('auth-register', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip())
                    ->response(function ($request, $headers) {
                        $retry = (int)($headers['Retry-After'] ?? 60);
                        return response()->json([
                            'message'     => "พยายามสมัครบ่อยเกินไป กรุณาลองใหม่ใน {$retry} วินาที",
                            'code'        => 'RATE_LIMIT',
                            'retry_after' => $retry,
                        ], 429, $headers);
                    }),
            ];
        });
    }
}