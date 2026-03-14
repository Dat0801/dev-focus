<?php

namespace App\Repositories;

use App\Interfaces\TaskRepositoryInterface;
use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class TaskRepository implements TaskRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Task::where('user_id', Auth::id())->with(['project', 'workLogs']);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        return $query->paginate(15);
    }

    public function findById(string $id): ?Task
    {
        return Task::where('user_id', Auth::id())->with(['project', 'workLogs'])->find($id);
    }

    public function create(array $data): Task
    {
        $data['user_id'] = Auth::id();
        $workLogs = $data['work_logs'] ?? [];
        unset($data['work_logs']);
        
        $task = Task::create($data);
        
        if (!empty($workLogs)) {
            foreach ($workLogs as $log) {
                $task->workLogs()->create($log);
            }
        }
        
        return $task->load(['project', 'workLogs']);
    }

    public function update(string $id, array $data): bool
    {
        $task = $this->findById($id);
        if (!$task) {
            return false;
        }

        $workLogs = $data['work_logs'] ?? null;
        unset($data['work_logs']);

        // Only update fields that are in fillable
        $updated = $task->update($data);

        if ($workLogs !== null) {
            // Simple sync: delete existing and recreate
            $task->workLogs()->delete();
            foreach ($workLogs as $log) {
                unset($log['id']); // Remove ID to create new
                $task->workLogs()->create($log);
            }
        }

        return true; // Return true as we've processed the update
    }

    public function delete(string $id): bool
    {
        $task = $this->findById($id);
        if (!$task) {
            return false;
        }
        return $task->delete();
    }

    public function getTodayTasks(?string $date = null): Collection
    {
        $today = $date ?: now()->toDateString();
        return Task::where('user_id', Auth::id())
            ->with(['project', 'workLogs'])
            ->where(function ($query) use ($today) {
                // Task is due today
                $query->whereDate('due_date', $today)
                    // Or task starts today
                    ->orWhereDate('start_date', $today)
                    // Or today is within the task's date range
                    ->orWhere(function($q) use ($today) {
                        $q->whereDate('start_date', '<=', $today)
                          ->whereDate('due_date', '>=', $today);
                    })
                    // Or task is overdue and not completed
                    ->orWhere(function($q) use ($today) {
                        $q->whereDate('due_date', '<', $today)
                          ->where('status', '!=', 'done');
                    })
                    // Or task is in progress
                    ->orWhere('status', 'in_progress')
                    // Or task has no date and is not done
                    ->orWhere(function($q) {
                        $q->whereNull('due_date')
                          ->whereNull('start_date')
                          ->where('status', '!=', 'done');
                    });
            })
            ->orderBy('due_date', 'asc')
            ->get();
    }

    public function getUpcomingTasks(?string $date = null): Collection
    {
        $today = $date ?: now()->toDateString();
        return Task::where('user_id', Auth::id())
            ->with(['project', 'workLogs'])
            ->where(function ($query) use ($today) {
                $query->whereDate('due_date', '>', $today)
                    ->orWhereDate('start_date', '>', $today);
            })
            ->get();
    }

    public function getTasksByMonth(string $month): Collection
    {
        // Extract year and month from string (format: YYYY-MM)
        [$year, $m] = explode('-', $month);

        return Task::where('user_id', Auth::id())
            ->whereIn('status', ['todo', 'in_progress', 'done'])
            ->with(['project', 'pomodoroSessions' => function ($query) use ($year, $m) {
                $query->whereYear('start_time', $year)
                      ->whereMonth('start_time', $m);
            }])
            ->where(function ($query) use ($year, $m) {
                // Task starts in this month
                $query->where(function($q) use ($year, $m) {
                    $q->whereYear('start_date', $year)
                      ->whereMonth('start_date', $m);
                })
                // Or task is due in this month
                ->orWhere(function($q) use ($year, $m) {
                    $q->whereYear('due_date', $year)
                      ->whereMonth('due_date', $m);
                })
                // Or has pomodoro sessions in this month
                ->orWhereHas('pomodoroSessions', function ($q) use ($year, $m) {
                    $q->whereYear('start_time', $year)
                      ->whereMonth('start_time', $m);
                });
            })
            ->get();
    }
}
