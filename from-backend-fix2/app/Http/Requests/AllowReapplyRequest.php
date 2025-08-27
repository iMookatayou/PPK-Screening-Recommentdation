<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AllowReapplyRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        // ไม่บังคับส่ง allow_days; ถ้าส่งก็เป็นจำนวนวันบวก
        return ['allow_days' => ['nullable','integer','min:1','max:365']];
    }
}
