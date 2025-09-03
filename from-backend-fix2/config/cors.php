<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'me',
        'user',
    ],

    'allowed_methods' => ['*'],

    // ❗ ห้ามใช้ '*' เพราะต้องส่งคุกกี้ ให้ระบุ origin ทีละตัว
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')),

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

    'supports_credentials' => true,
];
