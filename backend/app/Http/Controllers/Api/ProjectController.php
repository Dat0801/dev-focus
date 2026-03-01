<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    protected $projectService;

    public function __construct(ProjectService $projectService)
    {
        $this->projectService = $projectService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return ProjectResource::collection($this->projectService->getAllProjects());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProjectRequest $request): ProjectResource
    {
        $project = $this->projectService->createProject($request->validated());
        return new ProjectResource($project);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse|ProjectResource
    {
        $project = $this->projectService->findProjectById($id);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }
        return new ProjectResource($project);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProjectRequest $request, string $id): JsonResponse|ProjectResource
    {
        $updated = $this->projectService->updateProject($id, $request->validated());
        if (!$updated) {
            return response()->json(['message' => 'Project not found or update failed'], 404);
        }
        $project = $this->projectService->findProjectById($id);
        return new ProjectResource($project);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $deleted = $this->projectService->deleteProject($id);
        if (!$deleted) {
            return response()->json(['message' => 'Project not found or delete failed'], 404);
        }
        return response()->json(['message' => 'Project deleted successfully']);
    }
}
