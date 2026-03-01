<?php

namespace App\Services;

use App\Interfaces\PomodoroRepositoryInterface;
use App\Models\PomodoroSession;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class PomodoroService
{
    protected $pomodoroRepository;

    public function __construct(PomodoroRepositoryInterface $pomodoroRepository)
    {
        $this->pomodoroRepository = $pomodoroRepository;
    }

    public function getAllSessions(): LengthAwarePaginator
    {
        return $this->pomodoroRepository->getAll();
    }

    public function findSessionById(string $id): ?PomodoroSession
    {
        return $this->pomodoroRepository->findById($id);
    }

    public function createSession(array $data): PomodoroSession
    {
        return $this->pomodoroRepository->create($data);
    }

    public function updateSession(string $id, array $data): bool
    {
        return $this->pomodoroRepository->update($id, $data);
    }

    public function deleteSession(string $id): bool
    {
        return $this->pomodoroRepository->delete($id);
    }

    public function getTodaySessions(): Collection
    {
        return $this->pomodoroRepository->getTodaySessions();
    }

    public function getWeeklySessions(): Collection
    {
        return $this->pomodoroRepository->getWeeklySessions();
    }

    public function getTodayFocusTime(): int
    {
        return $this->getTodaySessions()->sum('duration_minutes');
    }

    public function getWeeklyFocusTime(): int
    {
        return $this->getWeeklySessions()->sum('duration_minutes');
    }
}
