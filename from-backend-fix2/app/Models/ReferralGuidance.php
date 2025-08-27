<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralGuidance extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'question',
        'question_code',
        'question_title',
        'clinic',
        'symptoms',
        'note',
        'is_refer_case',
        'type',
        'created_by',
    ];

    // ใช้ cast ปกติของ Laravel: เวลา set เป็น array → จะถูก encode เป็น JSON ให้เอง
    protected $casts = [
        'clinic'        => 'array',
        'symptoms'      => 'array',
        'is_refer_case' => 'boolean',
        'type'          => 'string',
    ];

    // ค่าเริ่มต้นฝั่งแอป (แทน DEFAULT บน JSON ที่ MySQL 5.x ทำไม่ได้)
    protected $attributes = [
        'clinic'      => '[]',
        'symptoms'    => '[]',
        'note'        => '',
        'is_refer_case' => false,
        'type'        => 'guide',
        'created_by'  => '',
    ];

    /** กันเคสส่ง note = null → เก็บเป็น '' เสมอ */
    public function setNoteAttribute($value): void
    {
        $this->attributes['note'] = $value ?? '';
    }

    /** Safety net: ก่อนบันทึก บังคับให้ clinic/symptoms เป็น array (ห้าม null) */
    protected static function booted(): void
    {
        static::saving(function (self $m) {
            if ($m->clinic === null)   $m->clinic = [];   // cast จะ encode JSON ให้
            if ($m->symptoms === null) $m->symptoms = []; // cast จะ encode JSON ให้
            if ($m->note === null)     $m->note = '';
            if ($m->type === null || $m->type === '') $m->type = 'guide';
            if ($m->created_by === null) $m->created_by = '';
        });
    }
}
