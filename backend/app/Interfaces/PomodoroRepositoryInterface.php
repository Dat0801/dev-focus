<?php

namespace App\Interfaces;

use App\Models\PomodoroSession;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface PomodoroRepositoryInterface
{
    public function getAll(): LengthAwarePaginator;
    public function findById(string $id): ?PomodoroSession;
    public function create(array $data): PomodoroSession;
    public function update(string $id, array $data): bool;
    public function delete(string $id): bool;
    public function getTodaySessions(): Collection;
    public function getWeeklySessions(): Collection;
}
