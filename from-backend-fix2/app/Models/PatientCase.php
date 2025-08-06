<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientCase extends Model
{
    use HasFactory;

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
        'symptoms' => 'array',
    ];

    public function questionResults()
    {
        return $this->hasMany(QuestionResult::class, 'case_id', 'case_id');
    }
}
