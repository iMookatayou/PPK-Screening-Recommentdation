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

    protected $casts = [
        'summary_clinics' => 'array',
        'symptoms'        => 'array',
    ];

    /**
     * ความสัมพันธ์หลัก: question_results.patient_case_id → patient_cases.id
     */
    public function questionResults()
    {
        return $this->hasMany(QuestionResult::class, 'patient_case_id', 'id');
    }

    /**
     * (ออปชัน) ความสัมพันธ์เสริมด้วย case_id (string) — ใช้เฉพาะกรณีต้องค้นด้วยรหัสเคสภายนอก
     */
    public function questionResultsByCaseId()
    {
        return $this->hasMany(QuestionResult::class, 'case_id', 'case_id');
    }
}
