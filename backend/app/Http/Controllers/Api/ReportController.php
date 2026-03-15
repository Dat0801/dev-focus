<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TaskService;
use Illuminate\Http\Request;
use App\Http\Resources\TaskResource;
use App\Http\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReportController extends Controller
{
    protected $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
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
