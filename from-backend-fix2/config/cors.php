<?php

return [
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
 'allowed_origins' => array_filter([
    env('FRONT_URL'),
]),
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization'],
'max_age' => 0,
'supports_credentials' => true,

];
