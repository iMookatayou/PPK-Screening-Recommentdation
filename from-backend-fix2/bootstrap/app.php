<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use App\Http\Middleware\EnsureTablesExist;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Alias
        $middleware->alias([
            'db.tables'        => EnsureTablesExist::class,
            'manualTokenAuth'  => \App\Http\Middleware\ManualTokenAuth::class,
            'token.expiration' => \App\Http\Middleware\TokenExpirationCheck::class,
            'role'             => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        // <<< สำคัญ: ให้ตรวจตารางก่อนเสมอสำหรับทุกเส้นทางในกลุ่ม API >>>
        $middleware->prependToGroup('api', 'db.tables');

        // CORS / Session (ถ้าจำเป็นต้องใช้)
        $middleware->append([
            HandleCors::class,
            StartSession::class,
            AddQueuedCookiesToResponse::class,
            ShareErrorsFromSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // custom exception handler (ถ้ามี)
    })
    ->create();
