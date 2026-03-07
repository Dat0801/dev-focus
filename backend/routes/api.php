<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\PomodoroController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/tasks/today', [TaskController::class, 'today']);
    Route::get('/tasks/upcoming', [TaskController::class, 'upcoming']);
    Route::get('/reports/tasks-by-month', [ReportController::class, 'tasksByMonth']);
    Route::apiResource('tasks', TaskController::class);

    Route::apiResource('projects', ProjectController::class);
    
    Route::get('/pomodoro/today', [PomodoroController::class, 'todaySummary']);
    Route::apiResource('pomodoro', PomodoroController::class);

    // Dashboard Metrics
    Route::get('/dashboard/metrics', function (Request $request) {
        $user = $request->user();
        $taskService = app(\App\Services\TaskService::class);
        $pomodoroService = app(\App\Services\PomodoroService::class);

        $todayTasks = $taskService->getTodayTasks();
        $tasksTodayCount = $todayTasks->count();
        $completedTodayCount = $todayTasks->where('status', 'done')->count();
        
        $dailyGoal = 10; // This could be a user setting
        $dailyGoalPercentage = $tasksTodayCount > 0 ? round(($completedTodayCount / $dailyGoal) * 100) : 0;
        if ($dailyGoalPercentage > 100) $dailyGoalPercentage = 100;

        // Calculate weekly performance (last 7 days)
        $weeklyPerformance = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $count = \App\Models\Task::where('user_id', $user->id)
                ->where('status', 'done')
                ->whereDate('updated_at', $date)
                ->count();
            $weeklyPerformance[] = $count;
        }

        return response()->json([
             'tasks_today' => $tasksTodayCount,
             'completed_today' => $completedTodayCount,
             'focus_time_today' => $pomodoroService->getTodayFocusTime(),
             'weekly_focus_hours' => round($pomodoroService->getWeeklyFocusTime() / 60, 2),
             'productivity_streak' => 0, // Placeholder
             'daily_goal_percentage' => $dailyGoalPercentage,
             'weekly_performance' => $weeklyPerformance
         ]);
    });
});
