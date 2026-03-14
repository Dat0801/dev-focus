<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'task_id',
        'log_date',
        'description',
        'duration_minutes',
    ];

    protected $casts = [
        'log_date' => 'date',
        'duration_minutes' => 'decimal:2',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
