<?php

use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    | ใส่เป็น host[:port] เท่านั้น ห้ามมี http/https/prefix อื่น ๆ
    */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:3000')),

    /*
    |--------------------------------------------------------------------------
    | Guards
    |--------------------------------------------------------------------------
    | สำหรับ SPA + Session ใช้ 'web' พอ เพื่อล็อกให้ตรวจ session เป็นหลัก
    */
    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration
    |--------------------------------------------------------------------------
    | session-based ของ SPA ไม่ได้ใช้อันนี้ ปล่อย null ได้
    */
    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix (สำหรับ personal access token เท่านั้น)
    */
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    */
    'middleware' => [
        'authenticate_session' => AuthenticateSession::class,
        'encrypt_cookies'      => EncryptCookies::class,
        'validate_csrf_token'  => ValidateCsrfToken::class,
    ],

];
