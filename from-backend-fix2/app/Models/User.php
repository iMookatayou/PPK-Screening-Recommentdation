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

    // ===== Constants =====
    public const STATUS_PENDING  = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const ROLE_USER  = 'user';
    public const ROLE_ADMIN = 'admin';

    // Sentinel values (ตามสคีมาที่ไม่รับ NULL)
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
        'email',
        'password',

        'status',       // pending | approved | rejected
        'role',         // user | admin

        'approved_at',
        'rejected_reason',
        'email_verified_at',

        'reapply_allowed',
        'reapply_until',
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
        // reapply_until เป็น DATE (string) อาจเป็น sentinel -> cast 'date' ได้
        'reapply_until'     => 'date',
    ];

    /**
     * Appends (serialize อัตโนมัติ)
     */
    protected $appends = ['full_name', 'name', 'is_approved', 'can_reapply'];

    // ===== Helpers for sentinel =====
    public static function isEpochDate(?string $date): bool
    {
        return !$date || $date === self::EPOCH_DATE;
    }

    public static function isEpochDateTime(?string $dt): bool
    {
        return !$dt || $dt === self::EPOCH_DATETIME;
    }

    // ===== Accessors =====
    public function getFullNameAttribute(): string
    {
        return trim(sprintf('%s %s', $this->first_name ?? '', $this->last_name ?? ''));
    }

    public function getNameAttribute(): string
    {
        $username     = $this->attributes['username']     ?? null; // ถ้าไม่มีคอลัมน์จะคง null
        $display_name = $this->attributes['display_name'] ?? null;

        return $display_name
            ?: ($username ?: ($this->full_name ?: ($this->email !== null ? (string) $this->email : (string) $this->cid)));
    }

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function getCanReapplyAttribute(): bool
    {
        if (!$this->reapply_allowed) return false;

        // sentinel 1970-01-01 = ไม่มี until => อนุญาตเลย
        $until = $this->getAttribute('reapply_until');
        if (self::isEpochDate($until)) {
            return true;
        }

        // มี until จริง -> วันนี้ <= until (รวมวันนั้น)
        return now()->startOfDay()->lte(Carbon::parse($until)->endOfDay());
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

    // ===== Mutators (Data Hygiene) — ห้ามคืน null ให้คอลัมน์ NOT NULL =====

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

    /** cid: ต้องเป็นตัวเลข 13 หลักเท่านั้น (กันค่ากลายเป็น '' จนชน UNIQUE) */
    public function setCidAttribute(?string $value): void
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        if (strlen($digits) !== 13) {
            throw new \InvalidArgumentException('CID must be exactly 13 digits');
        }
        $this->attributes['cid'] = $digits;
    }

    /** first_name / last_name: ถ้าอยากเข้มให้สอดคล้องกับ validator (required) */
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
        if ($value instanceof Carbon) {
            $this->attributes['reapply_until'] = $value->toDateString();
        } else {
            $this->attributes['reapply_until'] = (string) $value;
        }
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
