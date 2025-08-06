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

    protected $casts = [
        'clinic' => 'array',
        'symptoms' => 'array',
        'is_refer_case' => 'boolean',
        'type' => 'string',
    ];
}
