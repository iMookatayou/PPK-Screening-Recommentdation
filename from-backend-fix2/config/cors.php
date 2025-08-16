<?php
$origins = array_values(array_filter(array_map('trim', explode(',', env('FRONT_ORIGINS', '')))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,     // ต้องระบุเป็น origin จริง ๆ เมื่อใช้ credentials
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,

    // ถ้าใช้ Bearer token ไม่พึ่งคุกกี้ -> false (แนะนำ ลดความยุ่ง CORS)
    // ถ้าใช้คุกกี้/เซสชัน -> true และต้องตั้ง SANCTUM + SESSION ตามด้านบนให้ครบ
    'supports_credentials' => false,
];
