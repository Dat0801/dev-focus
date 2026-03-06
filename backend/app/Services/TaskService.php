<?php

namespace App\Services;

use App\Interfaces\TaskRepositoryInterface;
use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class TaskService
{
    protected $taskRepository;

    public function __construct(TaskRepositoryInterface $taskRepository)
    {
        $this->taskRepository = $taskRepository;
    }

    public function getAllTasks(array $filters = []): LengthAwarePaginator
    {
        return $this->taskRepository->getAll($filters);
    }

    public function findTaskById(string $id): ?Task
    {
        return $this->taskRepository->findById($id);
    }

    public function createTask(array $data): Task
    {
        return $this->taskRepository->create($data);
    }

    public function updateTask(string $id, array $data): bool
    {
        return $this->taskRepository->update($id, $data);
    }

    public function deleteTask(string $id): bool
    {
        return $this->taskRepository->delete($id);
    }

    public function getTodayTasks(?string $date = null): Collection
    {
        return $this->taskRepository->getTodayTasks($date);
    }

    public function getUpcomingTasks(?string $date = null): Collection
    {
        return $this->taskRepository->getUpcomingTasks($date);
    }
}
