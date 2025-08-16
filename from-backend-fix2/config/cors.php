<?php
$origins = collect(explode(',', env('FRONT_ORIGINS', '')))
    ->map(fn ($o) => rtrim(trim($o), '/'))  // กันสแลชท้าย
    ->filter()->values()->all();

return [
    'paths' => ['api/*'], // หรือ ['api/*','sanctum/csrf-cookie'] ถ้าคงไว้
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false, // ใช้ Bearer token
];
