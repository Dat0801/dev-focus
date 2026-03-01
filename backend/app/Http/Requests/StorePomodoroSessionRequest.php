<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePomodoroSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'task_id' => 'nullable|exists:tasks,id',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'duration_minutes' => 'nullable|integer|min:1',
        ];
    }
}
