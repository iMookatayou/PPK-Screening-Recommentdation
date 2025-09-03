<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /* ---------- 1) ตั้ง alias ตามที่ใช้จริง ---------- */
        $middleware->alias([
            'db.tables'        => \App\Http\Middleware\EnsureTablesExist::class,
            'manualTokenAuth'  => \App\Http\Middleware\ManualTokenAuth::class,
            'token.expiration' => \App\Http\Middleware\TokenExpirationCheck::class,
            'role'             => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        /* ---------- 2) เปิดโหมด stateful API (สำคัญสำหรับ Sanctum) ----------
         * ใส่ EnsureFrontendRequestsAreStateful ให้กลุ่ม api
         * และ AuthenticateSession ให้กลุ่ม web ให้อัตโนมัติ
         */
        $middleware->statefulApi();

        /* ---------- 3) ลำดับ middleware เพิ่มเติม ----------
         * - ตารางต้องพร้อมก่อนเสมอในกลุ่ม api
         * - CORS ผูกกับกลุ่ม api ก็พอ (อย่าใส่ global)
         */
        $middleware->prependToGroup('api', 'db.tables');
        $middleware->appendToGroup('api', \Illuminate\Http\Middleware\HandleCors::class);

        /* ไม่ต้องใส่ StartSession / AddQueuedCookies / ShareErrors เป็น global
         * เพราะกลุ่ม web มีให้แล้ว และ statefulApi() จัดการที่จำเป็นให้
         */
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // custom exception handler (ถ้ามี)
    })
    ->create();
