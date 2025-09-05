<?php

// app/Http/Middleware/RoleMiddleware.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'ok'      => false,
                'code'    => 'UNAUTHENTICATED',
                'message' => 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
            ], 401);
        }

        if (!isset($user->role) || $user->role !== $role) {
            return response()->json([
                'ok'      => false,
                'code'    => 'FORBIDDEN',
                'message' => "ต้องเป็นผู้ใช้สิทธิ์ {$role} เท่านั้น",
            ], 403);
        }

        return $next($request);
    }
}
