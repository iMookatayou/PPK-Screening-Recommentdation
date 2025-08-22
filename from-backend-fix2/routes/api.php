<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormPPKController;
use App\Http\Controllers\ReferralGuidanceController;
use App\Http\Controllers\DiseaseController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\SummaryController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:auth-register');

Route::post('/login-token', [AuthController::class, 'login'])
    ->middleware('throttle:auth-login');

/*
|--------------------------------------------------------------------------
| Debug routes (ชั่วคราวไว้เทสบนเซิร์ฟเวอร์ที่เด้ง)
|--------------------------------------------------------------------------
| - /api/debug/headers จะบอกว่า Authorization header มาถึง Laravel ไหม
| - /api/auth-ping ทดสอบผ่านกลุ่ม protected ว่า resolve user ได้จริงไหม
*/
Route::get('/debug/headers', function (Request $r) {
    return response()->json([
        'request_url' => $r->fullUrl(),
        'auth_header' => $r->header('Authorization'),
        'bearer'      => $r->bearerToken(),
    ]);
})->name('debug.headers');

// เลือก guard จาก .env: API_GUARD=sanctum | manual
$useSanctum = env('API_GUARD', 'manual') === 'sanctum';
$protectedMiddlewares = $useSanctum
    ? ['auth:sanctum']                          // ใช้ Sanctum (Bearer PAT)
    : ['manualTokenAuth', 'token.expiration'];  // ใช้ middleware เดิมของคุณ

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/
Route::middleware($protectedMiddlewares)->group(function () use ($useSanctum) {

    // Ping ทดสอบในกลุ่ม protected (จะผ่านต่อเมื่อ auth ถูกต้อง)
    Route::get('/auth-ping', function (Request $r) {
        $u = $r->user();
        return response()->json([
            'ok'    => (bool) $u,
            'id'    => $u->id   ?? null,
            'email' => $u->email?? null,
        ]);
    })->name('debug.auth_ping');

    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'update']);
    Route::post('/logout-token', [AuthController::class, 'logout']);

    // Referral Guidance
    Route::post('/referral-guidances', [ReferralGuidanceController::class, 'store']);
    Route::get('/referral-guidances/summary', [ReferralGuidanceController::class, 'summary']);

    // Form PPK
    Route::get('/form-ppk', [FormPPKController::class, 'index']);
    Route::post('/form-ppk', [FormPPKController::class, 'store']);
    Route::get('/form-ppk/summary', [FormPPKController::class, 'summary']);
    Route::get('/form-ppk/{case_id}', [FormPPKController::class, 'show']);
    Route::put('/form-ppk/{case_id}', [FormPPKController::class, 'update']);
    Route::delete('/form-ppk/{case_id}', [FormPPKController::class, 'destroy']);

    Route::post('/patients/history', [FormPPKController::class, 'historyPost']);
    Route::post('/form-ppk/show', [FormPPKController::class, 'showPost']);

    Route::get('/diseases', [DiseaseController::class, 'index']);

    // Summary
    Route::get('/summary', [SummaryController::class, 'index']);

    // Admin Only
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/pending', [AdminUserController::class, 'getPendingUsers']);
        Route::put('/users/{id}/approve', [AdminUserController::class, 'approveUser']);
        Route::put('/users/{id}/reject',  [AdminUserController::class, 'rejectUser']);
        Route::put('/users/{id}/allow-reapply', [AdminUserController::class, 'allowReapply']);
        Route::put('/users/{id}/block-reapply', [AdminUserController::class, 'blockReapply']);
    });
});
