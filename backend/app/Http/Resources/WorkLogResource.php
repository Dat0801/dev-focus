<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkLogResource extends JsonResource
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
            'log_date' => $this->log_date ? $this->log_date->toDateString() : null,
            'description' => $this->description,
            'duration_minutes' => (float) $this->duration_minutes,
        ];
    }
}
