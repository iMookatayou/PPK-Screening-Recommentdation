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
        /* ====================================================
         |  1) ตั้ง alias middleware ตามที่ใช้จริง
         * ==================================================== */
        $middleware->alias([
            'db.tables'        => \App\Http\Middleware\EnsureTablesExist::class,
            'manualTokenAuth'  => \App\Http\Middleware\ManualTokenAuth::class,
            'token.expiration' => \App\Http\Middleware\TokenExpirationCheck::class,
            'role'             => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        /* ====================================================
         |  2) เปิด stateful API mode (สำคัญสำหรับ Sanctum)
         |     - ใส่ EnsureFrontendRequestsAreStateful ให้ group api
         |     - ใส่ AuthenticateSession ให้ group web ให้อัตโนมัติ
         * ==================================================== */
        $middleware->statefulApi();

        /* ====================================================
         |  3) ปรับลำดับ middleware ของ group api เพิ่มเติม
         |     - ตรวจสอบตารางก่อนเสมอ
         |     - CORS เฉพาะ group api
         * ==================================================== */
        $middleware->prependToGroup('api', 'db.tables');
        $middleware->appendToGroup('api', \Illuminate\Http\Middleware\HandleCors::class);

        // หมายเหตุ: ไม่ต้องใส่ StartSession / AddQueuedCookies / ShareErrors เป็น global
        // เพราะกลุ่ม web มีครบแล้ว และ statefulApi() จะจัดการให้เอง
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // กำหนด exception handler เพิ่มได้ถ้าต้องการ
    })
    ->create();
