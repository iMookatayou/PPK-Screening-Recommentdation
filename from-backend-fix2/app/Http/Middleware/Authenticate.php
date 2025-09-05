<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        if ($request->expectsJson()) {
            return null; // จะให้ตอบ JSON 401 แทน redirect
        }
        return null;
    }
}
