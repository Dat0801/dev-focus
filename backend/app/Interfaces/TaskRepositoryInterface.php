<?php

namespace App\Interfaces;

use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface TaskRepositoryInterface
{
    public function getAll(array $filters = []): LengthAwarePaginator;
    public function findById(string $id): ?Task;
    public function create(array $data): Task;
    public function update(string $id, array $data): bool;
    public function delete(string $id): bool;
    public function getTodayTasks(?string $date = null): Collection;
    public function getUpcomingTasks(?string $date = null): Collection;
    public function getTasksByMonth(string $month): Collection;
}
