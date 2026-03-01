<?php

namespace App\Interfaces;

use App\Models\Project;
use Illuminate\Pagination\LengthAwarePaginator;

interface ProjectRepositoryInterface
{
    public function getAll(): LengthAwarePaginator;
    public function findById(string $id): ?Project;
    public function create(array $data): Project;
    public function update(string $id, array $data): bool;
    public function delete(string $id): bool;
}
