<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * URIs ที่ไม่ต้องตรวจ CSRF
     *
     * @var array<int, string>
     */
    protected $except = [
        // 'sanctum/csrf-cookie',
        // 'api/*',
    ];
}
