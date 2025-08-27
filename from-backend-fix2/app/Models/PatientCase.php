<?php
// app/Models/PatientCase.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientCase extends Model
{
    use HasFactory;

    protected $table = 'patient_cases';

    protected $fillable = [
        'case_id',
        'cid',
        'name',
        'age',
        'gender',
        'maininscl_name',
        'hmain_name',
        'summary_clinics',
        'symptoms',
    ];

    // แปลง JSON <-> array ให้ Eloquent ดูแลตอนอ่าน/เขียน
    protected $casts = [
        'summary_clinics' => 'array',
        'symptoms'        => 'array',
    ];

    // ตั้งค่าเริ่มต้นฝั่งแอป (แทน DEFAULT ใน DB ที่ทำไม่ได้บน MySQL 5.x)
    protected $attributes = [
        'maininscl_name'  => '',
        'hmain_name'      => '',
        'summary_clinics' => '[]',
        'symptoms'        => '[]',
    ];

    /**
     * Relationships
     */
    public function questionResults()
    {
        return $this->hasMany(QuestionResult::class, 'patient_case_id', 'id');
    }

    public function questionResultsByCaseId()
    {
        return $this->hasMany(QuestionResult::class, 'case_id', 'case_id');
    }

    /**
     * Mutators: กัน null/สตริง ให้กลายเป็น array เสมอ (แล้วค่อยให้ cast จัดการ)
     */
    public function setSummaryClinicsAttribute($value): void
    {
        $this->attributes['summary_clinics'] = json_encode($this->normalizeArray($value), JSON_UNESCAPED_UNICODE);
    }

    public function setSymptomsAttribute($value): void
    {
        $this->attributes['symptoms'] = json_encode($this->normalizeArray($value), JSON_UNESCAPED_UNICODE);
    }

    /**
     * Helper: รับ null | string JSON | string เดี่ยว | array -> array<string>
     */
    private function normalizeArray($value): array
    {
        if ($value === null) return [];
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = [$value];
            }
        }

        // map เป็น string, trim, ตัดค่าว่าง, unique
        $arr = array_values(array_filter(array_map(function ($v) {
            if (is_array($v) || is_object($v)) return null;
            if (!is_string($v)) $v = is_scalar($v) ? (string)$v : null;
            if ($v === null) return null;
            $v = trim($v);
            return $v === '' ? null : $v;
        }, (array) $value)));

        return array_values(array_unique($arr));
    }
}
