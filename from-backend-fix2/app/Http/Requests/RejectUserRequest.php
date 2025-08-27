<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return ['reason' => ['nullable','string','max:255']];
    }
}
