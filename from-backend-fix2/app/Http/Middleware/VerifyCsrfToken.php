<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * ระบุว่า response cookie ของ CSRF ควรเข้ารหัสหรือไม่
     *
     * @var bool
     */
    protected $addHttpCookie = true;

    /**
     * URI ที่ยกเว้นไม่ต้องตรวจสอบ CSRF
     *
     * @var array<int, string>
     */
    protected $except = [
        // ยกเว้น endpoint ของ Sanctum SPA Auth
        'sanctum/csrf-cookie',

        'api/login',
        'api/logout',
    ];
}
