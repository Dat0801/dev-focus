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
        $query = Task::where('user_id', Auth::id())->with('project');

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
        return Task::where('user_id', Auth::id())->with('project')->find($id);
    }

    public function create(array $data): Task
    {
        $data['user_id'] = Auth::id();
        $task = Task::create($data);
        return $task->load('project');
    }

    public function update(string $id, array $data): bool
    {
        $task = $this->findById($id);
        if (!$task) {
            return false;
        }
        return $task->update($data);
    }

    public function delete(string $id): bool
    {
        $task = $this->findById($id);
        if (!$task) {
            return false;
        }
        return $task->delete();
    }

    public function getTodayTasks(): Collection
    {
        return Task::where('user_id', Auth::id())
            ->with('project')
            ->whereDate('due_date', now()->toDateString())
            ->get();
    }

    public function getUpcomingTasks(): Collection
    {
        return Task::where('user_id', Auth::id())
            ->with('project')
            ->whereDate('due_date', '>', now()->toDateString())
            ->get();
    }
}
