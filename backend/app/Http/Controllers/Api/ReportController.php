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
use App\Models\PomodoroSession;

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

            // Get today's tasks directly to avoid potential repository/auth issues
            $todayTasks = Task::where('user_id', $user->id)
                ->whereNull('parent_id')
                ->where(function ($query) {
                    $today = now()->toDateString();
                    $query->whereDate('due_date', $today)
                        ->orWhereDate('start_date', $today)
                        ->orWhere(function($q) use ($today) {
                            $q->whereDate('start_date', '<=', $today)
                              ->whereDate('due_date', '>=', $today);
                        });
                })
                ->get();

            $tasksTodayCount = $todayTasks->count();
            $completedTodayCount = $todayTasks->where('status', 'done')->count();
            
            $dailyGoal = 10; // This could be a user setting
            $dailyGoalPercentage = $tasksTodayCount > 0 ? (int) round(($completedTodayCount / $dailyGoal) * 100) : 0;
            if ($dailyGoalPercentage > 100) $dailyGoalPercentage = 100;

            // Calculate weekly performance (last 7 days)
            $weeklyPerformance = [];
            $startDate = now()->subDays(6)->startOfDay();
            $endDate = now()->endOfDay();

            $performanceQuery = Task::where('user_id', $user->id)
                ->where('status', 'done')
                ->whereBetween('updated_at', [$startDate, $endDate]);

            if (config('database.default') === 'pgsql') {
                $performanceData = $performanceQuery->selectRaw('updated_at::date as date, count(*) as count')
                    ->groupBy('date')
                    ->pluck('count', 'date');
            } else {
                $performanceData = $performanceQuery->selectRaw('DATE(updated_at) as date, count(*) as count')
                    ->groupBy('date')
                    ->pluck('count', 'date');
            }

            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i)->toDateString();
                $weeklyPerformance[] = (int) ($performanceData[$date] ?? 0);
            }

            // Get focus time directly to avoid potential repository/auth issues
             $todayFocusTime = PomodoroSession::where('user_id', $user->id)
                 ->whereDate('created_at', now()->toDateString())
                 ->sum('duration_minutes') ?? 0;
 
             $weeklyFocusTime = PomodoroSession::where('user_id', $user->id)
                 ->whereBetween('created_at', [$startDate, $endDate])
                 ->sum('duration_minutes') ?? 0;

            return response()->json([
                'tasks_today' => (int) $tasksTodayCount,
                'completed_today' => (int) $completedTodayCount,
                'focus_time_today' => (int) $todayFocusTime,
                'weekly_focus_hours' => round($weeklyFocusTime / 60, 2),
                'productivity_streak' => 0, // Placeholder
                'daily_goal_percentage' => $dailyGoalPercentage,
                'weekly_performance' => $weeklyPerformance
            ]);
        } catch (\Throwable $e) {
            \Log::error('Dashboard metrics error: ' . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $request->user()?->id
            ]);
            return response()->json([
                'error' => 'Internal Server Error',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : null
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
