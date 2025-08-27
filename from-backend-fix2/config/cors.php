<?php

use Illuminate\Support\Str;

$origins = collect(explode(',', (string) env('FRONT_ORIGINS', '')))
    ->map(fn (string $o) => rtrim(trim($o), '/'))   // ตัดช่องว่าง + สแลชท้าย
    ->filter()
    ->values()
    ->all();

// ถ้าไม่กำหนด FRONT_ORIGINS ใน .env เลย ให้เปิดทุก origin ด้วย '*'
$allowAll = empty($origins);

return [
    /*
    |--------------------------------------------------------------------------
    | Paths ที่เปิด CORS
    |--------------------------------------------------------------------------
    | รวม API ทั้งหมด และ endpoint login-token ของคุณ
    | จะเพิ่ม/ลดได้ตามจริง เช่น 'login', 'logout', 'sanctum/csrf-cookie'
    */
    'paths' => [
        'api/*',
        'login-token',
    ],

    /*
    |--------------------------------------------------------------------------
    | Methods / Origins / Headers
    |--------------------------------------------------------------------------
    */
    'allowed_methods' => ['*'],

    // ถ้า FRONT_ORIGINS ว่าง -> อนุญาตทุก origin, ไม่งั้นอนุญาตตามรายการ
    'allowed_origins' => $allowAll ? ['*'] : $origins,

    'allowed_origins_patterns' => [],

    // รับทุก header จากฝั่งหน้าเว็บ
    'allowed_headers' => ['*'],

    // เผย header ที่อยากให้ฝั่งหน้าเว็บอ่านได้ (ตามต้องการ)
    'exposed_headers' => [
        'Authorization',
    ],

    // cache preflight (วินาที) — 1 วัน
    'max_age' => 86400,

    /*
    |--------------------------------------------------------------------------
    | Credentials
    |--------------------------------------------------------------------------
    | ใช้ Bearer token (ไม่พกคุกกี้) => false
    | ถ้าภายหลังเปลี่ยนไปใช้คุกกี้ (Sanctum stateful) ให้ปรับเป็น true
    | และห้ามใช้ '*' ใน allowed_origins (ต้องระบุ origin ชัดเจน)
    */
    'supports_credentials' => false,
];
