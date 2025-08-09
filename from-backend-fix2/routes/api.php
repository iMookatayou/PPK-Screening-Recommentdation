<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormPPKController;
use App\Http\Controllers\ReferralGuidanceController;
use App\Http\Controllers\DiseaseController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\SummaryController;

/*
|--------------------------------------------------------------------------
| Public Routes (ไม่ต้องมี token)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login-token', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

/*
|--------------------------------------------------------------------------
| Protected Routes (ต้องมี Bearer token และไม่หมดอายุ)
|--------------------------------------------------------------------------
*/
Route::middleware(['manualTokenAuth', 'token.expiration'])->group(function () {

    // ---------- Auth ----------
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'update']);
    Route::post('/logout-token', [AuthController::class, 'logout']);

    // ---------- Referral Guidance ----------
    Route::post('/referral-guidances', [ReferralGuidanceController::class, 'store']);
    Route::get('/referral-guidances/summary', [ReferralGuidanceController::class, 'summary']);

    // ---------- Form PPK ----------
    Route::get('/form-ppk', [FormPPKController::class, 'index']);
    Route::post('/form-ppk', [FormPPKController::class, 'store']);
    Route::get('/form-ppk/summary', [FormPPKController::class, 'summary']); // ไว้ก่อน {case_id}
    Route::get('/form-ppk/{case_id}', [FormPPKController::class, 'show']);
    Route::put('/form-ppk/{case_id}', [FormPPKController::class, 'update']);
    Route::delete('/form-ppk/{case_id}', [FormPPKController::class, 'destroy']);

    // ---------- Disease ----------
    Route::get('/diseases', [DiseaseController::class, 'index']);

    // ---------- Summary (ยอดรวมทั่วระบบ) ----------
    Route::get('/summary', [SummaryController::class, 'index']); // ?type, start_date, end_date

    // ---------- Admin Only ----------
    // ---------- Admin Only ----------
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users/pending', [AdminUserController::class, 'getPendingUsers']);
        Route::put('/users/{id}/approve', [AdminUserController::class, 'approveUser']); // ✅ แก้ตรงนี้
        Route::put('/users/{id}/reject', [AdminUserController::class, 'rejectUser']);
        Route::get('/users/all', [AdminUserController::class, 'getAllUsers']);
    });

});
