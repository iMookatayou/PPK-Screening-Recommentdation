<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionResult extends Model
{
    use HasFactory;

    protected $table = 'question_results';

    protected $fillable = [
        'patient_case_id',
        'case_id',
        'question',
        'question_key',
        'question_code',
        'question_title',
        'clinic',
        'symptoms',
        'note',
        'is_refer_case',
        'type',
        'created_by',        
    ];

    // ไม่ใช้ casts กับ clinic/symptoms เพราะคุม JSON เองผ่าน mutators/accessors
    protected $casts = [
        'is_refer_case' => 'boolean',
    ];

    // ค่า default ฝั่งแอป (MySQL 5.x ตั้ง DEFAULT บน JSON ไม่ได้)
    protected $attributes = [
        'clinic'   => '[]',
        'symptoms' => '[]',
        'note'     => '',
        'type'     => 'form',
    ];

    /* -----------------------------
     | Relationships
     * ----------------------------*/
    public function patientCase()
    {
        return $this->belongsTo(PatientCase::class, 'patient_case_id');
    }

    public function patientCaseByCode()
    {
        return $this->belongsTo(PatientCase::class, 'case_id', 'case_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /* -----------------------------
     | Mutators / Accessors (UTF-8 JSON)
     * ----------------------------*/
    public function setClinicAttribute($value): void
    {
        $this->attributes['clinic'] = $this->normalizeArrayToJson($value);
    }

    public function getClinicAttribute($value): array
    {
        return $this->decodeJsonArray($value);
    }

    public function setSymptomsAttribute($value): void
    {
        $this->attributes['symptoms'] = $this->normalizeArrayToJson($value);
    }

    public function getSymptomsAttribute($value): array
    {
        return $this->decodeJsonArray($value);
    }

    // กัน note เป็น null → สตริงว่าง (คอลัมน์ห้าม NULL)
    public function setNoteAttribute($value): void
    {
        $this->attributes['note'] = $value ?? '';
    }

    /* -----------------------------
     | Helpers
     * ----------------------------*/
    protected function normalizeArrayToJson($value): string
    {
        if ($value === null) return '[]';

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = [$value];
            }
        }

        $arr = array_values(array_filter(array_map(function ($v) {
            if (is_array($v) || is_object($v)) return null;
            if (!is_string($v)) $v = is_scalar($v) ? (string) $v : null;
            if ($v === null) return null;
            $v = trim($v);
            return $v === '' ? null : $v;
        }, (array) $value)));

        $arr = array_values(array_unique($arr));

        return json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    protected function decodeJsonArray($value): array
    {
        if (is_array($value)) return $value;
        if ($value === null || $value === '') return [];
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
