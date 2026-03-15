<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Services\TaskService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TaskController extends Controller
{
    protected $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->only(['status', 'priority', 'project_id']);
        $tasks = $this->taskService->getAllTasks($filters);
        return TaskResource::collection($tasks);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskRequest $request): TaskResource
    {
        $task = $this->taskService->createTask($request->validated());
        return new TaskResource($task);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse|TaskResource
    {
        $task = $this->taskService->findTaskById($id);
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }
        return new TaskResource($task);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateTaskRequest $request, string $id): JsonResponse|TaskResource
    {
        $updated = $this->taskService->updateTask($id, $request->validated());
        if (!$updated) {
            return response()->json(['message' => 'Task not found or update failed'], 404);
        }
        $task = $this->taskService->findTaskById($id);
        return new TaskResource($task);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $deleted = $this->taskService->deleteTask($id);
        if (!$deleted) {
            return response()->json(['message' => 'Task not found or delete failed'], 404);
        }
        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function today(Request $request): AnonymousResourceCollection
    {
        return TaskResource::collection($this->taskService->getTodayTasks($request->query('date')));
    }

    public function upcoming(Request $request): AnonymousResourceCollection
    {
        return TaskResource::collection($this->taskService->getUpcomingTasks($request->query('date')));
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'tasks' => 'required|array',
            'tasks.*.title' => 'required|string',
        ]);

        try {
            $importLogId = $this->taskService->importTasks($request->input('tasks'));
            return response()->json([
                'message' => 'Tasks import started',
                'import_log_id' => $importLogId,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'success' => false
            ], 400);
        }
    }
    public function importStatus(string $id): JsonResponse
    {
        $importLog = \App\Models\ImportLog::where('user_id', Auth::id())
            ->find($id);

        if (!$importLog) {
            return response()->json([
                'message' => 'Import log not found',
                'success' => false
            ], 404);
        }

        return response()->json([
            'import_log' => $importLog,
            'success' => true
        ]);
    }

    public function importLogs(): JsonResponse
    {
        $logs = $this->taskService->getImportLogs();
        return response()->json([
            'import_logs' => $logs,
            'success' => true
        ]);
    }
}
