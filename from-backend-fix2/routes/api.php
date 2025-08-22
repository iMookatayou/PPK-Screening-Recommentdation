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
| Public Routes (ต้องมี users + tokens)
|--------------------------------------------------------------------------
*/
Route::middleware(['db.tables:users,personal_access_tokens'])->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth-register');

    Route::post('/login-token', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');
});

/*
|--------------------------------------------------------------------------
| Protected Routes (ต้องมี users + tokens อย่างน้อยเสมอ)
|--------------------------------------------------------------------------
*/
Route::middleware(['db.tables:users,personal_access_tokens', 'manualTokenAuth', 'token.expiration'])
    ->group(function () {

    // ===== Auth (ยังคงใช้ users + tokens พอ) =====
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'update']);
    Route::post('/logout-token', [AuthController::class, 'logout']);

    // ===== Referral Guidance (ต้องมี referral_guidances + question_result) =====
    Route::middleware(['db.tables:referral_guidances,question_result'])->group(function () {
        Route::post('/referral-guidances', [ReferralGuidanceController::class, 'store']);
        Route::get('/referral-guidances/summary', [ReferralGuidanceController::class, 'summary']);
    });

    // ===== Form PPK (ต้องมี patient_cases + question_result) =====
    Route::middleware(['db.tables:patient_cases,question_result'])->group(function () {
        Route::get('/form-ppk', [FormPPKController::class, 'index']);
        Route::post('/form-ppk', [FormPPKController::class, 'store']);
        Route::get('/form-ppk/summary', [FormPPKController::class, 'summary']);
        Route::get('/form-ppk/{case_id}', [FormPPKController::class, 'show']);
        Route::put('/form-ppk/{case_id}', [FormPPKController::class, 'update']);
        Route::delete('/form-ppk/{case_id}', [FormPPKController::class, 'destroy']);

        Route::post('/patients/history', [FormPPKController::class, 'historyPost']);
        Route::post('/form-ppk/show', [FormPPKController::class, 'showPost']);
    });

    // ===== Diseases (ต้องมี diseases) =====
    Route::middleware(['db.tables:diseases'])->group(function () {
        Route::get('/diseases', [DiseaseController::class, 'index']);
    });

    // ===== Summary (สรุปรวม มักดึงหลายตาราง) =====
    Route::middleware(['db.tables:patient_cases,referral_guidances,question_result'])->group(function () {
        Route::get('/summary', [SummaryController::class, 'index']);
    });

    // ===== Admin Only (จัดการผู้ใช้ → ต้องมี users) =====
    Route::middleware(['role:admin', 'db.tables:users'])->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/pending', [AdminUserController::class, 'getPendingUsers']);
        Route::put('/users/{id}/approve', [AdminUserController::class, 'approveUser']);
        Route::put('/users/{id}/reject',  [AdminUserController::class, 'rejectUser']);
        Route::put('/users/{id}/allow-reapply', [AdminUserController::class, 'allowReapply']);
        Route::put('/users/{id}/block-reapply', [AdminUserController::class, 'blockReapply']);
    });
});
