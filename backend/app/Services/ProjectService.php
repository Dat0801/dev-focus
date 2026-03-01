<?php

namespace App\Services;

use App\Interfaces\ProjectRepositoryInterface;
use App\Models\Project;
use Illuminate\Pagination\LengthAwarePaginator;

class ProjectService
{
    protected $projectRepository;

    public function __construct(ProjectRepositoryInterface $projectRepository)
    {
        $this->projectRepository = $projectRepository;
    }

    public function getAllProjects(): LengthAwarePaginator
    {
        return $this->projectRepository->getAll();
    }

    public function findProjectById(string $id): ?Project
    {
        return $this->projectRepository->findById($id);
    }

    public function createProject(array $data): Project
    {
        return $this->projectRepository->create($data);
    }

    public function updateProject(string $id, array $data): bool
    {
        return $this->projectRepository->update($id, $data);
    }

    public function deleteProject(string $id): bool
    {
        return $this->projectRepository->delete($id);
    }
}
