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
    Route::get('/tasks/import/logs', [TaskController::class, 'importLogs']);
    Route::post('/tasks/import', [TaskController::class, 'import']);
    Route::get('/tasks/import/{id}', [TaskController::class, 'importStatus']);
    Route::get('/reports/months-with-data', [ReportController::class, 'monthsWithData']);
    Route::get('/reports/tasks-by-month', [ReportController::class, 'tasksByMonth']);
    Route::get('/reports/export-data', [ReportController::class, 'exportData']);
    Route::apiResource('tasks', TaskController::class);

    Route::apiResource('projects', ProjectController::class);
    
    Route::get('/pomodoro/today', [PomodoroController::class, 'todaySummary']);
    Route::apiResource('pomodoro', PomodoroController::class);

    // Dashboard Metrics
    Route::get('/dashboard/metrics', [ReportController::class, 'dashboardMetrics']);
});
