<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormPPKController;
use App\Http\Controllers\ReferralGuidanceController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);

Route::post('/login-token', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| /me - ใช้ manual token auth
|--------------------------------------------------------------------------
*/
Route::middleware('manualTokenAuth')->get('/me', function (Request $request) {
    return response()->json($request->user());
});

/*
|--------------------------------------------------------------------------
| Protected Routes (ใช้ manualTokenAuth)
|--------------------------------------------------------------------------
*/
Route::middleware(['manualTokenAuth'])->group(function () {

    // User
    Route::put('/user', [AuthController::class, 'update']);

    Route::post('/logout-token', [AuthController::class, 'logout']);

    // Referral Guidance
    Route::post('/referral-guidances', [ReferralGuidanceController::class, 'store']);
    Route::get('/referral-guidances/summary', [ReferralGuidanceController::class, 'summary']);

    // Form PPK
    Route::get('/form-ppk', [FormPPKController::class, 'index']);
    Route::post('/form-ppk', [FormPPKController::class, 'store']);
    Route::get('/form-ppk/{case_id}', [FormPPKController::class, 'show']);
    Route::put('/form-ppk/{case_id}', [FormPPKController::class, 'update']);
    Route::delete('/form-ppk/{case_id}', [FormPPKController::class, 'destroy']);

    // Admin Only
    Route::get('/admin-only', fn () => ['ok' => true])
        ->middleware('role:admin');
});
