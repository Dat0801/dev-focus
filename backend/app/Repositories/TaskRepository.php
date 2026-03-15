<?php

namespace App\Repositories;

use App\Interfaces\TaskRepositoryInterface;
use App\Models\Task;
use App\Models\WorkLog;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskRepository implements TaskRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator
    {
        $query = Task::where('user_id', Auth::id())
            ->with(['project' => function($q) {
                $q->withCount(['tasks' => function($tq) {
                    $tq->whereNull('parent_id');
                }, 'tasks as completed_tasks_count' => function($tq) {
                    $tq->whereNull('parent_id')->where('status', 'done');
                }]);
            }, 'workLogs', 'subTasks.workLogs', 'parent']);

        if (!isset($filters['include_subtasks']) || !$filters['include_subtasks']) {
            $query->whereNull('parent_id');
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        $perPage = $filters['per_page'] ?? 15;
        if ($perPage === 'all') {
            // Convert to a LengthAwarePaginator to match return type
            $tasks = $query->get();
            return new LengthAwarePaginator($tasks, $tasks->count(), $tasks->count() ?: 1, 1);
        }

        return $query->paginate($perPage);
    }

    public function findById(string $id): ?Task
    {
        return Task::where('user_id', Auth::id())
            ->with(['project', 'workLogs', 'subTasks.workLogs'])
            ->find($id);
    }

    public function create(array $data): Task
    {
        $data['user_id'] = Auth::id();
        $workLogs = $data['work_logs'] ?? [];
        unset($data['work_logs']);

        $subTasks = $data['sub_tasks'] ?? [];
        unset($data['sub_tasks']);
        
        $task = Task::create($data);
        
        $totalMinutes = 0;
        if (!empty($workLogs)) {
            foreach ($workLogs as $log) {
                $task->workLogs()->create($log);
                $totalMinutes += $log['duration_minutes'] ?? 0;
            }
        }

        if ($totalMinutes > 0) {
            $task->update(['work_hours' => round($totalMinutes / 60, 2)]);
        }

        if (!empty($subTasks)) {
            foreach ($subTasks as $subTaskData) {
                $subTaskData['parent_id'] = $task->id;
                $subTaskData['user_id'] = $task->user_id;
                $subTaskData['project_id'] = $task->project_id;
                Task::create($subTaskData);
            }
        }
        
        return $task->load(['project', 'workLogs', 'subTasks.workLogs']);
    }

    public function update(string $id, array $data): bool
    {
        $task = $this->findById($id);
        if (!$task) {
            return false;
        }

        $workLogs = $data['work_logs'] ?? null;
        unset($data['work_logs']);

        $subTasks = $data['sub_tasks'] ?? null;
        unset($data['sub_tasks']);

        // Only update fields that are in fillable
        $updated = $task->update($data);

        // If project_id or user_id changed, update all sub-tasks
        if (isset($data['project_id']) || isset($data['user_id'])) {
            $updateData = [];
            if (isset($data['project_id'])) {
                $updateData['project_id'] = $data['project_id'];
            }
            if (isset($data['user_id'])) {
                $updateData['user_id'] = $data['user_id'];
            }
            $task->subTasks()->update($updateData);
        }

        // If task is marked as done, also mark all sub-tasks as done
        if (isset($data['status']) && $data['status'] === 'done') {
            $task->subTasks()->update(['status' => 'done']);
        }

        if ($workLogs !== null) {
            // Simple sync: delete existing and recreate
            $task->workLogs()->delete();
            $totalMinutes = 0;
            foreach ($workLogs as $log) {
                unset($log['id']); // Remove ID to create new
                $task->workLogs()->create($log);
                $totalMinutes += $log['duration_minutes'] ?? 0;
            }
            $task->update(['work_hours' => round($totalMinutes / 60, 2)]);
        }

        if ($subTasks !== null) {
            // For sub-tasks, we might want to be more careful. 
            // If they have an ID, update them. If not, check if they exist by title.
            // Tasks not in the list should be deleted? 
            // For simplicity, let's just update/create.
            foreach ($subTasks as $subTaskData) {
                if (isset($subTaskData['id'])) {
                    $subTask = Task::find($subTaskData['id']);
                    if ($subTask) {
                        $subTask->update($subTaskData);
                    }
                } else {
                    // Try to find sub-task by title under the same parent
                    $existingSubTask = $task->subTasks()
                        ->where('title', $subTaskData['title'])
                        ->first();
                    
                    if ($existingSubTask) {
                        $existingSubTask->update($subTaskData);
                    } else {
                        $subTaskData['parent_id'] = $task->id;
                        $subTaskData['user_id'] = $task->user_id;
                        $subTaskData['project_id'] = $task->project_id;
                        Task::create($subTaskData);
                    }
                }
            }
        }

        return true;
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
            ->with(['project' => function($q) {
                $q->withCount(['tasks' => function($tq) {
                    $tq->whereNull('parent_id');
                }, 'tasks as completed_tasks_count' => function($tq) {
                    $tq->whereNull('parent_id')->where('status', 'done');
                }]);
            }, 'workLogs', 'subTasks.workLogs'])
            ->where(function ($query) use ($today) {
                // Task is due today
                $query->whereDate('due_date', $today)
                    // Or task starts today
                    ->orWhereDate('start_date', $today)
                    // Or today is within the task's date range
                    ->orWhere(function($q) use ($today) {
                        $q->whereDate('start_date', '<=', $today)
                          ->whereDate('due_date', '>=', $today);
                    });
            })
            ->whereNull('parent_id') // Only show top-level tasks in "Today" list
            ->orderBy('priority', 'desc')
            ->get();
    }

    public function getUpcomingTasks(?string $date = null): Collection
    {
        $today = $date ?: now()->toDateString();
        return Task::where('user_id', Auth::id())
            ->with(['project' => function($q) {
                $q->withCount(['tasks' => function($tq) {
                    $tq->whereNull('parent_id');
                }, 'tasks as completed_tasks_count' => function($tq) {
                    $tq->whereNull('parent_id')->where('status', 'done');
                }]);
            }, 'workLogs', 'subTasks.workLogs'])
            ->whereDate('due_date', '>', $today)
            ->whereNull('parent_id') // Only show top-level tasks
            ->orderBy('due_date', 'asc')
            ->get();
    }

    public function getTasksByMonth(string $month): Collection
    {
        $query = Task::where('user_id', Auth::id())
            ->where('status', 'done')
            ->with(['project' => function($q) {
                $q->withCount(['tasks' => function($tq) {
                    $tq->whereNull('parent_id');
                }, 'tasks as completed_tasks_count' => function($tq) {
                    $tq->whereNull('parent_id')->where('status', 'done');
                }]);
            }, 'workLogs', 'subTasks.workLogs'])
            ->whereNull('parent_id');

        if (config('database.default') === 'pgsql') {
            $query->whereRaw("TO_CHAR(end_date, 'YYYY-MM') = ?", [$month]);
        } else {
            $query->where('end_date', 'like', "$month%");
        }

        return $query->get();
    }

    public function getMonthsWithData(): Collection
    {
        // Get unique months from tasks (only done tasks with end_date)
        $query = Task::where('user_id', Auth::id())
            ->where('status', 'done')
            ->whereNotNull('end_date');

        if (config('database.default') === 'pgsql') {
            return $query->selectRaw("TO_CHAR(end_date, 'YYYY-MM') as month")
                ->distinct()
                ->orderBy('month', 'desc')
                ->pluck('month');
        }

        return $query->selectRaw("DATE_FORMAT(end_date, '%Y-%m') as month")
            ->distinct()
            ->orderBy('month', 'desc')
            ->pluck('month');
    }

    public function getProjectsWithTasksByMonth(string $month): Collection
    {
        // We want all projects that have completed tasks in this month
        return \App\Models\Project::where('user_id', Auth::id())
            ->withCount(['tasks' => function($tq) {
                $tq->whereNull('parent_id');
            }, 'tasks as completed_tasks_count' => function($tq) {
                $tq->whereNull('parent_id')->where('status', 'done');
            }])
            ->with(['tasks' => function($query) use ($month) {
                $query->whereNull('parent_id')
                    ->where('status', 'done');

                if (config('database.default') === 'pgsql') {
                    $query->whereRaw("TO_CHAR(end_date, 'YYYY-MM') = ?", [$month]);
                } else {
                    $query->where('end_date', 'like', "$month%");
                }

                $query->with(['workLogs' => function($q) use ($month) {
                    if (config('database.default') === 'pgsql') {
                        $q->whereRaw("TO_CHAR(log_date, 'YYYY-MM') = ?", [$month]);
                    } else {
                        $q->where('log_date', 'like', "$month%");
                    }
                }, 'subTasks' => function($q) use ($month) {
                    $q->with(['workLogs' => function($ql) use ($month) {
                        if (config('database.default') === 'pgsql') {
                            $ql->whereRaw("TO_CHAR(log_date, 'YYYY-MM') = ?", [$month]);
                        } else {
                            $ql->where('log_date', 'like', "$month%");
                        }
                    }]);
                }]);
            }])
            ->whereHas('tasks', function($query) use ($month) {
                $query->whereNull('parent_id')
                    ->where('status', 'done');
                
                if (config('database.default') === 'pgsql') {
                    $query->whereRaw("TO_CHAR(end_date, 'YYYY-MM') = ?", [$month]);
                } else {
                    $query->where('end_date', 'like', "$month%");
                }
            })
            ->get();
    }

    public function import(array $tasks): string
    {
        $userId = Auth::id();
        
        $importLog = \App\Models\ImportLog::create([
            'user_id' => $userId,
            'status' => 'pending',
            'total_count' => count($tasks),
        ]);

        \App\Jobs\ImportTasksJob::dispatch($tasks, $userId, $importLog->id);

        return $importLog->id;
    }

    public function getImportLogs(): Collection
    {
        return \App\Models\ImportLog::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
