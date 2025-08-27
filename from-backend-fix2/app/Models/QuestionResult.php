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
        'routed_by',
    ];

    // ไม่ใช้ casts กับ clinic/symptoms เพราะคุม JSON เอง
    protected $casts = [
        'is_refer_case' => 'boolean',
    ];

    // Default ฝั่งแอป (แทน DEFAULT บน JSON ที่ MySQL 5.x ทำไม่ได้)
    protected $attributes = [
        'clinic'    => '[]',
        'symptoms'  => '[]',
        'note'      => '',
        'type'      => 'form',
        'routed_by' => '',
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

    // กัน note เป็น null → สตริงว่าง (ตารางห้าม NULL)
    public function setNoteAttribute($value): void
    {
        $this->attributes['note'] = $value ?? '';
    }

    /* -----------------------------
     | Helpers
     * ----------------------------*/
    // รับ array / สตริง JSON / สตริงธรรมดา → เก็บเป็น JSON (ไม่ escape unicode) | ไม่คืน null
    protected function normalizeArrayToJson($value): string
    {
        // null => []
        if ($value === null) return '[]';

        // ถ้าเป็นสตริง ลอง decode เป็น JSON ก่อน
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                // ไม่ใช่ JSON → treat เป็น 1 ค่า
                $value = [$value];
            }
        }

        // บังคับเป็น array ของ string, ตัดค่าว่าง, unique, reindex
        $arr = array_values(array_filter(array_map(function ($v) {
            if (is_array($v) || is_object($v)) return null;
            if (!is_string($v)) $v = is_scalar($v) ? (string)$v : null;
            if ($v === null) return null;
            $v = trim($v);
            return $v === '' ? null : $v;
        }, (array)$value)));

        $arr = array_values(array_unique($arr));

        return json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    // string(JSON) | array | null → array (ว่างให้เป็น [])
    protected function decodeJsonArray($value): array
    {
        if (is_array($value)) return $value;
        if ($value === null || $value === '') return [];
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
