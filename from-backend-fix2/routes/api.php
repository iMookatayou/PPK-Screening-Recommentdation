<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormPPKController;
use App\Http\Controllers\ReferralGuidanceController;
use App\Http\Controllers\DiseaseController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\SummaryController;

// Public
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login-token', [AuthController::class, 'login']);

// Protected (ใช้ ManualTokenAuth)
Route::middleware('manualTokenAuth')->group(function () {

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

    // Diseases
    Route::get('/diseases', [DiseaseController::class, 'index']);

    // Summary
    Route::get('/summary', [SummaryController::class, 'index']);

    // Admin Only
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/pending', [AdminUserController::class, 'getPendingUsers']);
        Route::put('/users/{id}/approve', [AdminUserController::class, 'approveUser']);
        Route::put('/users/{id}/reject', [AdminUserController::class, 'rejectUser']);
        Route::put('/users/{id}/allow-reapply', [AdminUserController::class, 'allowReapply']);
        Route::put('/users/{id}/block-reapply', [AdminUserController::class, 'blockReapply']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
    });
});
