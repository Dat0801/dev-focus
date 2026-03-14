<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->due_date,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'work_hours' => (float) $this->work_hours,
            'work_log' => $this->work_log,
            'estimated_pomodoros' => (int) $this->estimated_pomodoros,
            'completed_pomodoros' => (int) $this->completed_pomodoros,
            'priority' => $this->priority,
            'status' => $this->status,
            'project_id' => $this->project_id,
            'parent_id' => $this->parent_id,
            'project' => new ProjectResource($this->whenLoaded('project')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'work_logs' => WorkLogResource::collection($this->whenLoaded('workLogs')),
            'pomodoro_sessions' => PomodoroSessionResource::collection($this->whenLoaded('pomodoroSessions')),
            'sub_tasks' => TaskResource::collection($this->whenLoaded('subTasks')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
