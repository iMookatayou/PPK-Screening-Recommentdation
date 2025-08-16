<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

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

        // ----- สมัครสมาชิก (ถ้าต้องการข้อความไทยด้วย) -----
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

        // routes mapping
        $this->routes(function () {
            Route::middleware('api')->prefix('api')->group(base_path('routes/api.php'));
            Route::middleware('web')->group(base_path('routes/web.php'));
        });
    }
}
