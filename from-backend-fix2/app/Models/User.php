<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    // แนะนำให้มีคงที่ไว้ใช้ในโค้ดส่วนอื่น ๆ
    public const STATUS_PENDING  = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const ROLE_USER  = 'user';
    public const ROLE_ADMIN = 'admin';

    /**
     * ฟิลด์ที่อนุญาตให้กรอกผ่าน mass assignment
     */
    protected $fillable = [
        'cid',
        'first_name',
        'last_name',
        'email',
        'password',

        'status',            // pending | approved | rejected
        'role',              // user | admin

        'approved_at',
        'rejected_reason',
        'email_verified_at',

        // อนุญาตสมัครใหม่
        'reapply_allowed',
        'reapply_until',
    ];

    /**
     * ฟิลด์ที่ซ่อนไม่ให้ serialize กลับไปยัง response
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * แปลงชนิดข้อมูลอัตโนมัติ
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at'       => 'datetime',
        'reapply_allowed'   => 'boolean',
        'reapply_until'     => 'date',
    ];

    /**
     * Appends: เพิ่ม accessor ลงไปให้ serialize อัตโนมัติ
     */
    protected $appends = ['full_name', 'name', 'is_approved', 'can_reapply'];

    // ===== Accessors =====

    public function getFullNameAttribute(): string
    {
        return trim(sprintf('%s %s', $this->first_name ?? '', $this->last_name ?? ''));
    }

    public function getNameAttribute(): string
    {
        $username     = $this->attributes['username']     ?? null; // ไม่มีคอลัมน์ก็ fine -> null
        $display_name = $this->attributes['display_name'] ?? null;

        return $display_name
            ?: ($username ?: ($this->full_name ?: ($this->email ?? (string) $this->cid)));
    }

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function getCanReapplyAttribute(): bool
    {
        if (!$this->reapply_allowed) return false;
        // ถ้าไม่มี until = อนุญาตเลย, ถ้ามีจนถึงวันที่กำหนด (รวมวันนั้น)
        return !$this->reapply_until
            || now()->startOfDay()->lte(Carbon::parse($this->reapply_until)->endOfDay());
    }

    // ===== Scopes =====

    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_REJECTED);
    }

    public function scopeSearch(Builder $q, ?string $term): Builder
    {
        $term = trim((string)$term);
        if ($term === '') return $q;

        return $q->where(function (Builder $qq) use ($term) {
            $qq->where('first_name', 'like', "%{$term}%")
               ->orWhere('last_name',  'like', "%{$term}%")
               ->orWhere('email',      'like', "%{$term}%")
               ->orWhere('cid',        'like', "%{$term}%");
        });
    }

    // ===== Mutators (Data Hygiene) =====

    public function setEmailAttribute(?string $value): void
    {
        $this->attributes['email'] = $value ? mb_strtolower(trim($value)) : null;
    }

    public function setPasswordAttribute(string $value): void
    {
        // ป้องกัน hash ซ้ำ หากค่าที่ส่งมาเป็น hash อยู่แล้ว
        $this->attributes['password'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function setCidAttribute(?string $value): void
    {
        // เก็บเฉพาะตัวเลข 13 หลัก
        $digits = preg_replace('/\D/', '', (string) $value);
        $this->attributes['cid'] = $digits;
    }

    public function setFirstNameAttribute(?string $value): void
    {
        $this->attributes['first_name'] = $value ? trim($value) : null;
    }

    public function setLastNameAttribute(?string $value): void
    {
        $this->attributes['last_name'] = $value ? trim($value) : null;
    }

    // ===== Token Helpers (Sanctum) =====

    /**
     * ออกโทเคนใหม่ (ลบของเก่าชื่อเดียวกันก่อน) พร้อมกำหนดวันหมดอายุ (ดีฟอลต์ 24 ชม.)
     */
    public function issueToken(string $name = 'auth_token', array $abilities = ['*'], ?Carbon $expiresAt = null): string
    {
        $this->tokens()->where('name', $name)->delete();
        $expiresAt = $expiresAt ?? now()->addDay();
        $token = $this->createToken($name, $abilities, $expiresAt);
        return $token->plainTextToken;
    }

    /** เพิกถอนโทเคนตามชื่อ */
    public function revokeTokenByName(string $name = 'auth_token'): void
    {
        $this->tokens()->where('name', $name)->delete();
    }

    /** เพิกถอนโทเคนทั้งหมดของผู้ใช้ */
    public function revokeAllTokens(): void
    {
        $this->tokens()->delete();
    }
}
