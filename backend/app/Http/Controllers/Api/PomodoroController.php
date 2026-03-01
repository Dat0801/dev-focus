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

    public function todaySummary(): JsonResponse
    {
        return response()->json([
            'focus_time_minutes' => $this->pomodoroService->getTodayFocusTime(),
            'sessions_count' => $this->pomodoroService->getTodaySessions()->count()
        ]);
    }
}
