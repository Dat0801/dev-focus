<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TaskService;
use App\Services\PomodoroService;
use Illuminate\Http\Request;
use App\Http\Resources\TaskResource;
use App\Http\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Models\Task;

class ReportController extends Controller
{
    protected $taskService;
    protected $pomodoroService;

    public function __construct(TaskService $taskService, PomodoroService $pomodoroService)
    {
        $this->taskService = $taskService;
        $this->pomodoroService = $pomodoroService;
    }

    /**
     * Get dashboard metrics.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function dashboardMetrics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $todayTasks = $this->taskService->getTodayTasks();
            $tasksTodayCount = $todayTasks->count();
            $completedTodayCount = $todayTasks->where('status', 'done')->count();
            
            $dailyGoal = 10; // This could be a user setting
            $dailyGoalPercentage = $tasksTodayCount > 0 ? round(($completedTodayCount / $dailyGoal) * 100) : 0;
            if ($dailyGoalPercentage > 100) $dailyGoalPercentage = 100;

            // Calculate weekly performance (last 7 days)
            $weeklyPerformance = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i)->toDateString();
                $count = Task::where('user_id', $user->id)
                    ->where('status', 'done')
                    ->whereDate('updated_at', $date)
                    ->count();
                $weeklyPerformance[] = $count;
            }

            return response()->json([
                'tasks_today' => $tasksTodayCount,
                'completed_today' => $completedTodayCount,
                'focus_time_today' => $this->pomodoroService->getTodayFocusTime(),
                'weekly_focus_hours' => round($this->pomodoroService->getWeeklyFocusTime() / 60, 2),
                'productivity_streak' => 0, // Placeholder
                'daily_goal_percentage' => $dailyGoalPercentage,
                'weekly_performance' => $weeklyPerformance
            ]);
        } catch (\Exception $e) {
            \Log::error('Dashboard metrics error: ' . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $request->user()?->id
            ]);
            return response()->json([
                'error' => 'Internal Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get months with data.
     * 
     * @return JsonResponse
     */
    public function monthsWithData(): JsonResponse
    {
        $months = $this->taskService->getMonthsWithData();
        return response()->json($months);
    }

    /**
     * Get tasks for report by month.
     * 
     * @param Request $request
     * @return AnonymousResourceCollection
     */
    public function tasksByMonth(Request $request): AnonymousResourceCollection
    {
        $month = $request->query('month', now()->format('Y-m'));
        $tasks = $this->taskService->getTasksByMonth($month);
        
        return TaskResource::collection($tasks);
    }

    /**
     * Get export data by month.
     * 
     * @param Request $request
     * @return AnonymousResourceCollection
     */
    public function exportData(Request $request): AnonymousResourceCollection
    {
        $month = $request->query('month', now()->format('Y-m'));
        $projects = $this->taskService->getProjectsWithTasksByMonth($month);
        
        return ProjectResource::collection($projects);
    }
}
