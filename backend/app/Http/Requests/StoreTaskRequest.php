<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'work_hours' => 'nullable|numeric|min:0',
            'work_log' => 'nullable|string',
            'work_logs' => 'nullable|array',
            'work_logs.*.id' => 'nullable|uuid',
            'work_logs.*.log_date' => 'required|date',
            'work_logs.*.description' => 'nullable|string',
            'work_logs.*.duration_minutes' => 'required|numeric|min:0',
            'estimated_pomodoros' => 'nullable|integer|min:1',
            'completed_pomodoros' => 'nullable|integer|min:0',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:todo,in_progress,done',
            'project_id' => 'nullable|exists:projects,id',
            'sub_tasks' => 'nullable|array',
            'sub_tasks.*.id' => 'nullable|uuid',
            'sub_tasks.*.title' => 'required|string|max:255',
            'sub_tasks.*.status' => 'nullable|in:todo,in_progress,done',
            'sub_tasks.*.priority' => 'nullable|in:low,medium,high,urgent',
            'sub_tasks.*.due_date' => 'nullable|date',
        ];
    }
}
