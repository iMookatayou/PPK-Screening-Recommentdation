<?php

$envOrigins = env('CORS_ALLOWED_ORIGINS', 'http://localhost:4001,http://127.0.0.1:4001');
$origins = array_values(array_filter(array_map('trim', explode(',', $envOrigins))));

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',  // ต้องมีสำหรับรับ XSRF-TOKEN
        'login',
        'logout',
        'me',
        'user',
    ],

    'allowed_methods' => ['*'],

    // ใช้รายการที่กรองแล้ว
    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'X-XSRF-TOKEN',
        'Accept',
        'Origin',
        'Authorization',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    // ต้อง true สำหรับ cookie-based auth (Sanctum SPA)
    'supports_credentials' => true,
];
