<?php

namespace App\Repositories;

use App\Interfaces\ProjectRepositoryInterface;
use App\Models\Project;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class ProjectRepository implements ProjectRepositoryInterface
{
    public function getAll(): LengthAwarePaginator
    {
        return Project::where('user_id', Auth::id())->paginate(15);
    }

    public function findById(string $id): ?Project
    {
        return Project::where('user_id', Auth::id())->with('tasks')->find($id);
    }

    public function create(array $data): Project
    {
        $data['user_id'] = Auth::id();
        return Project::create($data);
    }

    public function update(string $id, array $data): bool
    {
        $project = $this->findById($id);
        if (!$project) {
            return false;
        }
        return $project->update($data);
    }

    public function delete(string $id): bool
    {
        $project = $this->findById($id);
        if (!$project) {
            return false;
        }
        return $project->delete();
    }
}
