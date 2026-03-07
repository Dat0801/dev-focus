<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TaskService;
use Illuminate\Http\Request;
use App\Http\Resources\TaskResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReportController extends Controller
{
    protected $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
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
}
