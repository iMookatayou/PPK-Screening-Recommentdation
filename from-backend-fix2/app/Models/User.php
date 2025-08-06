<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Carbon\Carbon;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * สร้างหรือดึง token รายวัน (1 user = 1 token ต่อวัน)
     * ✅ ไม่เก็บ plain_text_token
     */
    public function createOrGetDailyToken(): string
    {
        $nowThai = Carbon::now('Asia/Bangkok');
        $expiresAt = $nowThai->copy()->endOfDay();

        // หา token เดิมที่ยังไม่หมดอายุ
        $existingToken = $this->tokens()
            ->where('name', 'auth_token')
            ->where(function ($q) use ($nowThai) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', $nowThai);
            })
            ->latest()
            ->first();

        if ($existingToken) {
            // เอา token ล่าสุดมาใช้ (คืน plaintext)
            return $existingToken->getPlainTextToken(); // ⛔️ ❌ ใช้ไม่ได้ ถ้าไม่เก็บ plaintext
        }

        // ลบ token เก่าหมดก่อน
        $this->tokens()->where('name', 'auth_token')->delete();

        // สร้าง token ใหม่
        $newToken = $this->createToken('auth_token', ['*'], $expiresAt);
        return $newToken->plainTextToken; // ✅ คืนให้ frontend เก็บเอง
    }
}
