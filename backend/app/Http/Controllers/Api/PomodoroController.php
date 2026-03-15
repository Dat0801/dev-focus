<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePomodoroSessionRequest;
use App\Http\Requests\UpdatePomodoroSessionRequest;
use App\Http\Resources\PomodoroSessionResource;
use App\Services\PomodoroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PomodoroController extends Controller
{
    protected $pomodoroService;

    public function __construct(PomodoroService $pomodoroService)
    {
        $this->pomodoroService = $pomodoroService;
    }

    public function index(): AnonymousResourceCollection
    {
        return PomodoroSessionResource::collection($this->pomodoroService->getAllSessions());
    }

    public function store(StorePomodoroSessionRequest $request): PomodoroSessionResource
    {
        $session = $this->pomodoroService->createSession($request->validated());
        return new PomodoroSessionResource($session);
    }

    public function show(string $id): JsonResponse|PomodoroSessionResource
    {
        $session = $this->pomodoroService->findSessionById($id);
        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        return new PomodoroSessionResource($session);
    }

    public function update(UpdatePomodoroSessionRequest $request, string $id): JsonResponse|PomodoroSessionResource
    {
        $updated = $this->pomodoroService->updateSession($id, $request->validated());
        if (!$updated) {
            return response()->json(['message' => 'Session not found or update failed'], 404);
        }
        $session = $this->pomodoroService->findSessionById($id);
        return new PomodoroSessionResource($session);
    }

    public function destroy(string $id): JsonResponse
    {
        $deleted = $this->pomodoroService->deleteSession($id);
        if (!$deleted) {
            return response()->json(['message' => 'Session not found or delete failed'], 404);
        }
        return response()->json(['message' => 'Session deleted successfully']);
    }

    public function todaySummary(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $sessions = $this->pomodoroService->getTodaySessions();
            $sessionsCount = $sessions->count();
            $focusTimeMinutes = $sessions->sum('duration_minutes');

            return response()->json([
                'focus_time_minutes' => (int) $focusTimeMinutes,
                'sessions_count' => (int) $sessionsCount
            ]);
        } catch (\Throwable $e) {
            \Log::error('Pomodoro today summary error: ' . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Internal Server Error',
                'message' => config('app.debug') ? $e->getMessage() : 'An error occurred while fetching today summary'
            ], 500);
        }
    }
}
