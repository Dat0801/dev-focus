<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'category',
        'color',
        'deadline',
        'user_id',
    ];

    protected $appends = ['progress', 'status', 'tasks_count'];

    protected $casts = [
        'deadline' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function getProgressAttribute(): float
    {
        // Use loaded attributes if available from withCount
        $tasksCount = $this->attributes['tasks_count'] ?? null;
        $completedTasksCount = $this->attributes['completed_tasks_count'] ?? null;

        if ($tasksCount !== null && $completedTasksCount !== null) {
            $tasksCount = (int) $tasksCount;
            $completedTasksCount = (int) $completedTasksCount;
            return $tasksCount === 0 ? 0 : round(($completedTasksCount / $tasksCount) * 100, 2);
        }

        // Use relationLoaded to avoid N+1 if tasks are already loaded
        if ($this->relationLoaded('tasks')) {
            $tasks = $this->tasks->whereNull('parent_id');
            $totalTasks = $tasks->count();
            if ($totalTasks === 0) return 0;
            
            $completedTasks = $tasks->where('status', 'done')->count();
            return round(($completedTasks / $totalTasks) * 100, 2);
        }

        // Fallback but with check to avoid recursion if called during serialization
        return 0;
    }

    public function getStatusAttribute(): string
    {
        return $this->progress >= 100.0 ? 'completed' : 'in_progress';
    }

    public function getTasksCountAttribute(): int
    {
        // Use loaded attribute if available from withCount
        if (isset($this->attributes['tasks_count'])) {
            return (int) $this->attributes['tasks_count'];
        }

        if ($this->relationLoaded('tasks')) {
            return $this->tasks->whereNull('parent_id')->count();
        }
        
        return 0;
    }
}
