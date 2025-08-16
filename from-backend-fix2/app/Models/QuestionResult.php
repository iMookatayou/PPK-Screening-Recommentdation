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
        'created_at',
        'updated_at',
    ];

    // ไม่ใช้ casts กับ clinic/symptoms เพราะเราคุมการ encode/decode เองเพื่อใส่ JSON_UNESCAPED_UNICODE
    protected $casts = [
        'is_refer_case' => 'boolean',
    ];

    /* -----------------------------
     | Relationships
     * ----------------------------*/
    public function patientCase()
    {
        return $this->belongsTo(PatientCase::class, 'patient_case_id');
    }

    // (ออปชัน) เข้าถึงด้วย case_id (string)
    public function patientCaseByCode()
    {
        return $this->belongsTo(PatientCase::class, 'case_id', 'case_id');
    }

    /* -----------------------------
     | Mutators / Accessors (UTF-8 JSON)
     * ----------------------------*/

    /**
     * Encode clinic เป็น JSON แบบไม่ escape unicode
     */
    public function setClinicAttribute($value): void
    {
        $this->attributes['clinic'] = $this->encodeUtf8JsonArray($value);
    }

    /**
     * คืน clinic เป็น array เสมอ
     */
    public function getClinicAttribute($value): array
    {
        return $this->decodeJsonArray($value);
    }

    /**
     * Encode symptoms เป็น JSON แบบไม่ escape unicode
     */
    public function setSymptomsAttribute($value): void
    {
        $this->attributes['symptoms'] = $this->encodeUtf8JsonArray($value);
    }

    /**
     * คืน symptoms เป็น array เสมอ
     */
    public function getSymptomsAttribute($value): array
    {
        return $this->decodeJsonArray($value);
    }

    /* -----------------------------
     | Helpers
     * ----------------------------*/

    /**
     * แปลงค่าให้เป็น array ของ string ที่สะอาด แล้ว encode เป็น JSON แบบ JSON_UNESCAPED_UNICODE
     */
    protected function encodeUtf8JsonArray($value): ?string
    {
        if ($value === null) {
            return null;
        }

        // บังคับเป็น array ของ string และตัดช่องว่าง/ค่าว่างออก
        $arr = is_array($value) ? $value : [$value];
        $arr = array_values(array_filter(array_map(function ($v) {
            if (!is_string($v)) {
                // แปลง non-string ให้เป็น string (เช่น int/bool)
                $v = is_scalar($v) ? (string) $v : null;
            }
            $v = $v !== null ? trim($v) : null;
            return $v === '' ? null : $v;
        }, $arr)));

        return json_encode($arr, JSON_UNESCAPED_UNICODE);
    }

    /**
     * decode JSON string → array (ว่างให้เป็น [])
     */
    protected function decodeJsonArray($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
