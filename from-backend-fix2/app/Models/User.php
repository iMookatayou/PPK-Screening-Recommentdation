<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str;
use DateTimeInterface;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    // ===== Constants =====
    public const STATUS_PENDING  = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const ROLE_USER  = 'user';
    public const ROLE_ADMIN = 'admin';

    // Sentinel values (คอลัมน์ไม่รับ NULL)
    public const EPOCH_DATETIME = '1970-01-01 00:00:01';
    public const EPOCH_DATE     = '1970-01-01';
    public const EMPTY          = '';

    /**
     * Mass-assignable
     */
    protected $fillable = [
        'cid',
        'first_name',
        'last_name',
        'username',
        'email',
        'password',
        'status',
        'role',
        'approved_at',
        'rejected_reason',
        'email_verified_at',
        'reapply_allowed',
        'reapply_until',
        'remember_token',
        'last_login_at',
    ];

    /**
     * Hidden
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Casts
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at'       => 'datetime',
        'reapply_allowed'   => 'boolean',
        'reapply_until'     => 'date',
        'last_login_at'     => 'datetime',
    ];

    /**
     * Appends (serialize อัตโนมัติ)
     */
    protected $appends = ['full_name', 'name', 'is_approved', 'can_reapply'];

    /* ---------------- Sentinel Helpers ---------------- */
    public static function isEpochDate($date): bool
    {
        if ($date instanceof DateTimeInterface) {
            return $date->format('Y-m-d') === self::EPOCH_DATE;
        }
        $s = trim((string) $date);
        return $s === '' || $s === self::EPOCH_DATE;
    }

    public static function isEpochDateTime($dt): bool
    {
        if ($dt instanceof DateTimeInterface) {
            return $dt->format('Y-m-d H:i:s') === self::EPOCH_DATETIME;
        }
        $s = trim((string) $dt);
        return $s === '' || $s === self::EPOCH_DATETIME;
    }

    /* ---------------- Accessors ---------------- */
    public function getFullNameAttribute(): string
    {
        return trim(sprintf('%s %s', $this->first_name ?? '', $this->last_name ?? ''));
    }

    public function getNameAttribute(): string
    {
        // โชว์ username ก่อน แล้วค่อย fallback เป็นชื่อ-สกุล > email > cid
        $username = $this->attributes['username'] ?? null;
        $fullName = $this->full_name;
        $email    = $this->attributes['email'] ?? null;
        $cid      = $this->attributes['cid'] ?? null;

        return ($username ?: ($fullName !== '' ? $fullName : ($email ?: (string) $cid)));
    }

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function getCanReapplyAttribute(): bool
    {
        if (!$this->reapply_allowed) return false;

        $until = $this->getAttribute('reapply_until'); // Carbon|string|null
        if (self::isEpochDate($until)) {
            return true;
        }
        $end = $until instanceof Carbon
            ? $until->copy()->endOfDay()
            : Carbon::parse((string)$until)->endOfDay();

        return now()->startOfDay()->lte($end);
    }

    /* ---------------- Scopes ---------------- */
    public function scopePending(Builder $q): Builder  { return $q->where('status', self::STATUS_PENDING); }
    public function scopeApproved(Builder $q): Builder { return $q->where('status', self::STATUS_APPROVED); }
    public function scopeRejected(Builder $q): Builder { return $q->where('status', self::STATUS_REJECTED); }

    public function scopeSearch(Builder $q, ?string $term): Builder
    {
        $term = trim((string)$term);
        if ($term === '') return $q;

        return $q->where(function (Builder $qq) use ($term) {
            $qq->where('first_name', 'like', "%{$term}%")
               ->orWhere('last_name',  'like', "%{$term}%")
               ->orWhere('email',      'like', "%{$term}%")
               ->orWhere('cid',        'like', "%{$term}%")
               ->orWhere('username',   'like', "%{$term}%");
        });
    }

    // ใช้ตอน login: รองรับทั้ง email หรือ username
    public function scopeWhereLogin(Builder $q, string $login): Builder
    {
        $login = trim($login);
        return $q->where(function (Builder $qq) use ($login) {
            $qq->where('email', $login)
               ->orWhere('username', strtolower($login));
        });
    }

    /* ---------------- Mutators (Data Hygiene) ---------------- */

    /** email: บังคับต้องมีค่า (สอดคล้อง migration NOT NULL + UNIQUE) */
    public function setEmailAttribute(?string $value): void
    {
        if ($value === null) {
            throw new \InvalidArgumentException('Email is required');
        }
        $v = trim($value);
        if ($v === '') {
            throw new \InvalidArgumentException('Email cannot be empty');
        }
        $this->attributes['email'] = mb_strtolower($v);
    }

    /** password: hash อัตโนมัติถ้าจำเป็น */
    public function setPasswordAttribute(string $value): void
    {
        $this->attributes['password'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    /** cid: ต้องเป็นตัวเลข 13 หลัก */
    public function setCidAttribute(?string $value): void
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        if (strlen($digits) !== 13) {
            throw new \InvalidArgumentException('CID must be exactly 13 digits');
        }
        $this->attributes['cid'] = $digits;
    }

    /** first_name / last_name: required */
    public function setFirstNameAttribute(?string $value): void
    {
        $v = trim((string)$value);
        if ($v === '') {
            throw new \InvalidArgumentException('First name is required');
        }
        $this->attributes['first_name'] = $v;
    }

    public function setLastNameAttribute(?string $value): void
    {
        $v = trim((string)$value);
        if ($v === '') {
            throw new \InvalidArgumentException('Last name is required');
        }
        $this->attributes['last_name'] = $v;
    }

    /** rejected_reason: NOT NULL -> เก็บ '' แทน null */
    public function setRejectedReasonAttribute(?string $value): void
    {
        $this->attributes['rejected_reason'] = ($value !== null) ? trim($value) : self::EMPTY;
    }

    /** approved_at / email_verified_at: ถ้า null -> ใช้ sentinel */
    public function setApprovedAtAttribute($value): void
    {
        if (empty($value)) {
            $this->attributes['approved_at'] = self::EPOCH_DATETIME;
            return;
        }
        $this->attributes['approved_at'] = $value instanceof Carbon
            ? $value->toDateTimeString()
            : (string) $value;
    }

    public function setEmailVerifiedAtAttribute($value): void
    {
        if (empty($value)) {
            $this->attributes['email_verified_at'] = self::EPOCH_DATETIME;
            return;
        }
        $this->attributes['email_verified_at'] = $value instanceof Carbon
            ? $value->toDateTimeString()
            : (string) $value;
    }

    public function setReapplyAllowedAttribute($value): void
    {
        $this->attributes['reapply_allowed'] = (bool) $value;
    }

    /** reapply_until: ถ้า null/ว่าง -> sentinel '1970-01-01' */
    public function setReapplyUntilAttribute($value): void
    {
        if (empty($value)) {
            $this->attributes['reapply_until'] = self::EPOCH_DATE;
            return;
        }
        $this->attributes['reapply_until'] = $value instanceof Carbon
            ? $value->toDateString()
            : (string) $value;
    }

    /** username: sanitize ถ้าผู้ใช้ส่งมาเอง (ถ้าไม่ส่ง ปล่อยว่างให้ lifecycle สร้างให้) */
    public function setUsernameAttribute($value): void
    {
        $v = trim((string)$value);

        if ($v === '') {
            // ให้ hook creating สร้างให้อัตโนมัติ
            $this->attributes['username'] = null;
            return;
        }

        // normalize: lower + อนุญาต [a-z0-9._] + จำกัดความยาว
        $v = strtolower($v);
        $v = preg_replace('/[^a-z0-9._]/', '', $v) ?? '';
        $v = substr($v, 0, 30);

        $this->attributes['username'] = $v === '' ? null : $v;
    }

    /* ---------------- Username Generators + Lifecycle ---------------- */

    protected static function generateUniqueUsernameBase(string $first, string $last = ''): string
    {
        // ใช้ชื่อ-นามสกุล → slug เป็นอังกฤษ คั่นด้วยจุด
        $raw  = trim($first . ' ' . $last);
        $base = Str::slug($raw !== '' ? $raw : 'user', '.'); // "สมชาย ใจดี" -> "somchai.jaidi"
        $base = str_replace('-', '.', $base);
        $base = preg_replace('/[^a-z0-9._]/', '', strtolower($base)) ?: 'user';
        return substr($base, 0, 20);
    }

    protected static function generateUniqueUsername(string $first, string $last = ''): string
    {
        $base = static::generateUniqueUsernameBase($first, $last);

        if (!static::query()->where('username', $base)->exists()) {
            return $base;
        }
        for ($i = 1; $i <= 9999; $i++) {
            $candidate = $base . $i; // somchai.jaidee1
            if (!static::query()->where('username', $candidate)->exists()) {
                return $candidate;
            }
        }
        return $base . Str::random(4);
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            // username: ถ้าไม่มี → generate จากชื่อ-สกุล
            if (empty($user->attributes['username'])) {
                $user->attributes['username'] = static::generateUniqueUsername(
                    $user->attributes['first_name'] ?? '',
                    $user->attributes['last_name']  ?? ''
                );
            }
        });
    }

    // ===== Token Helpers (Sanctum) =====

    /** ออกโทเคนใหม่ (ลบของเก่าชื่อเดียวกันก่อน) พร้อมกำหนดวันหมดอายุ (ดีฟอลต์ 24 ชม.) */
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
