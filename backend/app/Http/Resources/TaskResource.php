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
            'estimated_pomodoros' => (int) $this->estimated_pomodoros,
            'completed_pomodoros' => (int) $this->completed_pomodoros,
            'priority' => $this->priority,
            'status' => $this->status,
            'project_id' => $this->project_id,
            'project' => new ProjectResource($this->whenLoaded('project')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
