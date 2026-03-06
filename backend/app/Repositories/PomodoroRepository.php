<?php

namespace App\Repositories;

use App\Interfaces\PomodoroRepositoryInterface;
use App\Models\PomodoroSession;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PomodoroRepository implements PomodoroRepositoryInterface
{
    public function getAll(): LengthAwarePaginator
    {
        return PomodoroSession::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate(15);
    }

    public function findById(string $id): ?PomodoroSession
    {
        return PomodoroSession::where('user_id', Auth::id())->find($id);
    }

    public function create(array $data): PomodoroSession
    {
        $data['user_id'] = Auth::id();
        $session = PomodoroSession::create($data);

        // Update associated task progress
        if ($session->task_id && $session->duration_minutes) {
            $task = $session->task;
            if ($task) {
                $task->completed_pomodoros += 1;
                $task->work_hours = (float)$task->work_hours + ($session->duration_minutes / 60);
                $task->save();
            }
        }

        return $session;
    }

    public function update(string $id, array $data): bool
    {
        $session = $this->findById($id);
        if (!$session) {
            return false;
        }
        return $session->update($data);
    }

    public function delete(string $id): bool
    {
        $session = $this->findById($id);
        if (!$session) {
            return false;
        }
        return $session->delete();
    }

    public function getTodaySessions(): Collection
    {
        return PomodoroSession::where('user_id', Auth::id())
            ->whereDate('created_at', Carbon::today())
            ->get();
    }

    public function getWeeklySessions(): Collection
    {
        return PomodoroSession::where('user_id', Auth::id())
            ->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
            ->get();
    }
}
