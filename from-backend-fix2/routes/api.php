<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormPPKController;
use App\Http\Controllers\ReferralGuidanceController;
use App\Http\Controllers\DiseaseController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\SummaryController;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes (Sanctum SPA)
|--------------------------------------------------------------------------
| - Public: register, login, logout (อยู่ใน web.php)
| - Protected: auth:sanctum (cookie session)
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn(Request $r) => $r->user());

    Route::put('/user', [AuthController::class, 'update']);

    // Referral Guidance
    Route::post('/referral-guidances',        [ReferralGuidanceController::class, 'store']);
    Route::get('/referral-guidances/summary', [ReferralGuidanceController::class, 'summary']);

    // Form PPK
    Route::get('/form-ppk',             [FormPPKController::class, 'index']);
    Route::post('/form-ppk',            [FormPPKController::class, 'store']);
    Route::get('/form-ppk/summary',     [FormPPKController::class, 'summary']);
    Route::get('/form-ppk/{case_id}',   [FormPPKController::class, 'show']);
    Route::put('/form-ppk/{case_id}',   [FormPPKController::class, 'update']);
    Route::delete('/form-ppk/{case_id}',[FormPPKController::class, 'destroy']);
    Route::post('/patients/history',    [FormPPKController::class, 'historyPost']);
    Route::post('/form-ppk/show',       [FormPPKController::class, 'showPost']);

    // Diseases
    Route::get('/diseases', [DiseaseController::class, 'index']);

    // Summary
    Route::get('/summary', [SummaryController::class, 'index']);

    // Admin Only
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users',                     [AdminUserController::class, 'index']);
        Route::get('/users/pending',            [AdminUserController::class, 'getPendingUsers']);
        Route::put('/users/{id}/approve',       [AdminUserController::class, 'approveUser']);
        Route::put('/users/{id}/reject',        [AdminUserController::class, 'rejectUser']);
        Route::put('/users/{id}/allow-reapply', [AdminUserController::class, 'allowReapply']);
        Route::put('/users/{id}/block-reapply', [AdminUserController::class, 'blockReapply']);
        Route::delete('/users/{id}',            [AdminUserController::class, 'destroy']);
    });
});
