<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Session\TokenMismatchException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * รายชื่อ input ที่ไม่ควรใส่ใน flash (validation exception)
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        // แมป CSRF mismatch -> ส่ง JSON 419 เมื่อเป็นคำขอแบบ expectsJson
        $this->renderable(function (TokenMismatchException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok'      => false,
                    'code'    => 'CSRF_TOKEN_MISMATCH',
                    'message' => 'ไม่สามารถยืนยัน CSRF token ได้',
                ], 419);
            }
            return null; // ปล่อย default behaviour สำหรับ non-JSON
        });
    }

    // ถ้าต้องการ override render()/report() ค่อยเพิ่มภายหลัง
}
