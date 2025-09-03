<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/*
|--------------------------------------------------------------------------
| Web Routes (Sanctum SPA auth endpoints)
|--------------------------------------------------------------------------
| - ต้องอยู่ใน 'web' middleware group เพื่อให้ใช้ session/cookie
| - FE flow: GET /sanctum/csrf-cookie -> POST /login -> GET /api/me
*/

Route::post('/login', function (Request $request) {
    $validated = $request->validate([
        'cid'      => ['required','digits:13'],
        'password' => ['required','string'],
    ]);

    if (!Auth::attempt(['cid' => $validated['cid'], 'password' => $validated['password']], true)) {
        return response()->json(['message' => 'CID หรือรหัสผ่านไม่ถูกต้อง'], 422);
    }

    $request->session()->regenerate();

    return response()->json(['message' => 'ok']);
});

Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'ok']);
});

/* ถ้าต้องมีสมัครสมาชิกด้วย
Route::post('/register', [\App\Http\Controllers\AuthController::class, 'register']);
*/
