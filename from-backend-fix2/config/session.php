<?php

return [

    'driver' => env('SESSION_DRIVER', 'cookie'),

    'lifetime' => env('SESSION_LIFETIME', 120),

    'expire_on_close' => false,

    'encrypt' => false,

    /*
     | ถ้าใช้หลายซับโดเมน production ให้ตั้ง .example.com
     | dev แนะนำปล่อย null หรือระบุ ip/hostname ให้ตรง FE
     */
    'domain' => env('SESSION_DOMAIN', null),

    /*
     | dev (http) → 'lax' + secure=false
     | prod (https + cross-site) → 'none' + secure=true
     */
    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    'secure' => env('SESSION_SECURE_COOKIE', false),

    'http_only' => true,

    'path' => '/',

    'connection' => null,

    'table' => 'sessions',

    'store' => null,

    'lottery' => [2, 100],

];
