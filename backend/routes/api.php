<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\PomodoroController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/tasks/today', [TaskController::class, 'today']);
    Route::get('/tasks/upcoming', [TaskController::class, 'upcoming']);
    Route::apiResource('tasks', TaskController::class);

    Route::apiResource('projects', ProjectController::class);
    
    Route::get('/pomodoro/today', [PomodoroController::class, 'todaySummary']);
    Route::apiResource('pomodoro', PomodoroController::class);

    // Dashboard Metrics
    Route::get('/dashboard/metrics', function (Request $request) {
        $user = $request->user();
        $taskService = app(\App\Services\TaskService::class);
        $pomodoroService = app(\App\Services\PomodoroService::class);

        return response()->json([
            'tasks_today' => $taskService->getTodayTasks()->count(),
            'completed_today' => $taskService->getTodayTasks()->where('status', 'done')->count(),
            'focus_time_today' => $pomodoroService->getTodayFocusTime(),
            'weekly_focus_hours' => round($pomodoroService->getWeeklyFocusTime() / 60, 2),
            'productivity_streak' => 0, // Placeholder for streak logic
        ]);
    });
});
