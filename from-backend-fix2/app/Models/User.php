<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory; 
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    protected $fillable = [
        'cid',             // เลขบัตรประชาชน (13 หลัก)
        'first_name',
        'last_name',
        'email',
        'password',
        'status',          // pending / approved / rejected
        'role',            // user / admin
        // ถ้าคุณมีคอลัมน์เหล่านี้ใน DB แล้ว ให้เปิดใช้ได้เลย
        'approved_at',
        'rejected_reason',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        // ถ้ามีในตาราง:
        'approved_at'       => 'datetime',
    ];

    // ---------- Accessors / Appends ----------
    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    // ---------- Scopes ----------
    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', 'pending');
    }

    public function scopeApproved(Builder $q): Builder
    {
        return $q->where('status', 'approved');
    }

    // ---------- Mutators (Data Hygiene) ----------
    public function setEmailAttribute(?string $value): void
    {
        $this->attributes['email'] = $value ? mb_strtolower(trim($value)) : null;
    }

    public function setPasswordAttribute(string $value): void
    {
        // ป้องกันการ hash ซ้ำเมื่ออัปเดตผ่าน seeder/fixture ที่ส่งเป็น hash มาแล้ว
        $this->attributes['password'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function setCidAttribute(string $value): void
    {
        // เก็บเฉพาะตัวเลข 13 หลัก
        $digits = preg_replace('/\D/', '', $value ?? '');
        $this->attributes['cid'] = $digits;
    }

    // ---------- Token Helpers ----------
    /**
     * ออกโทเคน Sanctum แบบ "ต่ออายุรายวัน" (สิ้นสุดวันตามเวลาไทย)
     * แนวคิด: ลบโทเคนชื่อเดียวกันก่อน แล้วออกใหม่ -> ได้ plainTextToken ใหม่ทุกครั้ง
     * ถ้าตาราง tokens ของคุณไม่มีคอลัมน์ expires_at -> Sanctum จะใช้ค่า expiration จาก config แทน
     *
     * @param  string $name      ชื่อโทเคน (เช่น 'auth_token' หรือแนกตาม device)
     * @param  array  $abilities ความสามารถ (scopes) เริ่มต้น ['*']
     * @return string            plainTextToken (ส่งให้ฝั่ง FE)
     */
    public function createOrReuseDailyToken(string $name = 'auth_token', array $abilities = ['*']): string
    {
        $tz = config('app.timezone', 'Asia/Bangkok');
        $endOfDay = Carbon::now($tz)->endOfDay();

        // ลบโทเคนชื่อเดียวกันออกก่อน เพื่อไม่กองหลายตัว
        $this->tokens()->where('name', $name)->delete();

        // ใช้ Sanctum API มาตรฐาน (จะ hash ให้เอง)
        // Laravel 11 / Sanctum 4 รองรับส่ง expiresAt เป็น Carbon ได้
        $token = $this->createToken($name, $abilities, $endOfDay);

        return $token->plainTextToken;
    }

    /**
     * เพิกถอนโทเคนชื่อที่กำหนด (เช่นตอน logout)
     */
    public function revokeTokenByName(string $name = 'auth_token'): void
    {
        $this->tokens()->where('name', $name)->delete();
    }

    /**
     * เพิกถอนทุกโทเคนของผู้ใช้ (กรณี force logout ทั้งอุปกรณ์)
     */
    public function revokeAllTokens(): void
    {
        $this->tokens()->delete();
    }
}
