<?php

use Illuminate\Support\Facades\Route;
// routes/web.php
use App\Http\Controllers\AuthController;

Route::prefix('api')->middleware('web')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('login');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/me', [AuthController::class, 'me']);
});
