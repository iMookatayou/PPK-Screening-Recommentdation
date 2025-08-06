<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'case_id',
        'question',
        'question_code',
        'question_title',
        'clinic',
        'symptoms',
        'note',
        'is_refer_case',
        'type', 
    ];

    protected $casts = [
        'clinic' => 'array',
        'symptoms' => 'array',
        'is_refer_case' => 'boolean',
        'type' => 'string',
    ];

    public function toArray()
    {
        return json_decode(json_encode(parent::toArray(), JSON_UNESCAPED_UNICODE), true);
    }

    public function patientCase()
    {
        return $this->belongsTo(PatientCase::class, 'case_id', 'case_id');
    }
}

