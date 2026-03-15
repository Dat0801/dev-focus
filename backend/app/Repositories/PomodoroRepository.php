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
    protected function getUserId()
    {
        return Auth::id() ?? auth('sanctum')->id();
    }

    public function getAll(): LengthAwarePaginator
    {
        return PomodoroSession::where('user_id', $this->getUserId())
            ->orderBy('created_at', 'desc')
            ->paginate(15);
    }

    public function findById(string $id): ?PomodoroSession
    {
        return PomodoroSession::where('user_id', $this->getUserId())->find($id);
    }

    public function create(array $data): PomodoroSession
    {
        $data['user_id'] = $this->getUserId();
        $session = PomodoroSession::create($data);

        // Update associated task progress
        if ($session->task_id && $session->duration_minutes > 0) {
            $task = $session->task;
            if ($task) {
                $duration = (float) $session->duration_minutes;
                
                // Only increment completed_pomodoros if the duration is at least 25 minutes
                if ($duration >= 25) {
                    $task->completed_pomodoros += 1;
                }
                
                $task->work_hours = (float)$task->work_hours + ($duration / 60);
                
                // Aggregate work_log entry for the same task and day
                $logDate = now()->toDateString();
                $workLog = $task->workLogs()->where('log_date', $logDate)->first();

                if ($workLog) {
                    $workLog->duration_minutes = (float)$workLog->duration_minutes + $duration;
                    $workLog->save();
                } else {
                    $task->workLogs()->create([
                        'log_date' => $logDate,
                        'description' => 'Focus session',
                        'duration_minutes' => $duration,
                    ]);
                }
                
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
        $userId = $this->getUserId();
        if (!$userId) {
            return collect();
        }

        return PomodoroSession::where('user_id', $userId)
            ->whereDate('created_at', Carbon::today()->toDateString())
            ->get();
    }

    public function getWeeklySessions(): Collection
    {
        return PomodoroSession::where('user_id', $this->getUserId())
            ->whereBetween('created_at', [
                Carbon::now()->startOfWeek()->toDateTimeString(),
                Carbon::now()->endOfWeek()->toDateTimeString()
            ])
            ->get();
    }
}
