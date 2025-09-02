<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReferralGuidance extends Model
{
    use HasFactory;

    protected $table = 'referral_guidances';

    protected $fillable = [
        'question',
        'question_code',
        'question_title',
        'clinic',        // json
        'symptoms',      // json
        'note',
        'is_refer_case',
        'type',          // 'guide' | 'referral'
        'created_by',    // FK -> users.id
    ];

    protected $casts = [
        'clinic'        => 'array',
        'symptoms'      => 'array',
        'is_refer_case' => 'boolean',
    ];

    // ค่าเริ่มต้นสำหรับฟิลด์ที่ไม่อนุญาต null (JSON ใส่เป็นสตริง '[]' เพื่อให้ Eloquent แปลง)
    protected $attributes = [
        'clinic' => '[]',
        'symptoms' => '[]',
        'note' => '',
        'type' => 'guide',
        // 'created_by' เป็น nullable FK -> ไม่ตั้ง default
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
