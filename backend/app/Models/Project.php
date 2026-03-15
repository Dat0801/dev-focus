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
        // Try to use loaded tasks count if available via withCount
        if ($this->tasks_count !== null && $this->completed_tasks_count !== null) {
            if ($this->tasks_count === 0) return 0;
            return round(($this->completed_tasks_count / $this->tasks_count) * 100, 2);
        }

        // Use relationLoaded to avoid N+1 if tasks are already loaded
        if ($this->relationLoaded('tasks')) {
            $tasks = $this->tasks->whereNull('parent_id');
            $totalTasks = $tasks->count();
            if ($totalTasks === 0) return 0;
            
            $completedTasks = $tasks->where('status', 'done')->count();
            return round(($completedTasks / $totalTasks) * 100, 2);
        }

        // Fallback to direct query but only if not in a collection
        // To be safe and avoid N+1, we'll return 0 if it's not loaded
        // unless we're sure we're just viewing one project.
        // For now, let's keep it but be aware of the performance cost.
        $totalTasks = $this->tasks()->whereNull('parent_id')->count();
        if ($totalTasks === 0) {
            return 0;
        }

        $completedTasks = $this->tasks()->whereNull('parent_id')->where('status', 'done')->count();
        return round(($completedTasks / $totalTasks) * 100, 2);
    }

    public function getStatusAttribute(): string
    {
        $progress = $this->progress;
        if ($progress === 100.0) {
            return 'completed';
        }
        return 'in_progress';
    }

    public function getTasksCountAttribute(): int
    {
        if ($this->tasks_count !== null) {
            return $this->tasks_count;
        }

        if ($this->relationLoaded('tasks')) {
            return $this->tasks->whereNull('parent_id')->count();
        }
        return $this->tasks()->whereNull('parent_id')->count();
    }
}
