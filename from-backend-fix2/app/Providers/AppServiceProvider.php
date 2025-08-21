<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // โหลดเฉพาะตอน dev/test เท่านั้น เพื่อไม่พังใน production (ไม่มี dev deps)
        if ($this->app->environment('local', 'testing')) {
            if (class_exists(\Laravel\Pail\PailServiceProvider::class)) {
                $this->app->register(\Laravel\Pail\PailServiceProvider::class);
            }
        }
    }

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

        // ----- สมัครสมาชิก -----
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
