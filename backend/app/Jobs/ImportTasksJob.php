<?php

namespace App\Jobs;

use App\Models\ImportLog;
use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportTasksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tasks;
    protected $userId;
    protected $importLogId;

    /**
     * Create a new job instance.
     */
    public function __construct(array $tasks, string $userId, string $importLogId)
    {
        $this->tasks = $tasks;
        $this->userId = $userId;
        $this->importLogId = $importLogId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("Starting ImportTasksJob for user: $this->userId, log: $this->importLogId");
        $importLog = ImportLog::find($this->importLogId);
        if (!$importLog) {
            Log::error("ImportLog not found: $this->importLogId");
            return;
        }

        $importLog->update([
            'status' => 'processing',
            'started_at' => now(),
            'total_count' => count($this->tasks),
        ]);

        try {
            DB::transaction(function () use ($importLog) {
                $processedCount = 0;
                foreach ($this->tasks as $index => $taskData) {
                    $this->processTask($taskData);
                    $processedCount++;
                    
                    // Update progress periodically within transaction is tricky for visibility,
                    // but we can't update importLog outside without risking transaction isolation issues
                    // or losing the "all or nothing" property if we update log status.
                    // Actually, ImportLog is outside the rollback if we are careful, 
                    // but here we want everything rolled back.
                }

                $importLog->update([
                    'status' => 'completed',
                    'processed_count' => $processedCount,
                    'completed_at' => now(),
                ]);
            });
        } catch (\Exception $e) {
            Log::error("Import failed and rolled back: " . $e->getMessage());
            
            $importLog->update([
                'status' => 'failed',
                'error_count' => count($this->tasks),
                'errors' => [[
                    'task_index' => -1,
                    'title' => 'Global Error',
                    'error' => $e->getMessage(),
                ]],
                'completed_at' => now(),
            ]);
        }
    }

    private function processTask(array $taskData): void
    {
        // 1. Map status
        if (isset($taskData['status_raw'])) {
            $statusRaw = strtolower(trim($taskData['status_raw']));
            if (str_contains($statusRaw, 'in progress')) {
                $taskData['status'] = 'in_progress';
            } elseif (str_contains($statusRaw, 'completed') || str_contains($statusRaw, 'done') || str_contains($statusRaw, 'complete')) {
                $taskData['status'] = 'done';
            } elseif (str_contains($statusRaw, 'on hold') || str_contains($statusRaw, 'waiting') || str_contains($statusRaw, 'confirm')) {
                $taskData['status'] = 'on_hold';
            } else {
                $taskData['status'] = 'todo';
            }
            unset($taskData['status_raw']);
        }

        // 2. Parse dates
        if (!empty($taskData['start_date_raw'])) {
            $taskData['start_date'] = $this->parseDate($taskData['start_date_raw']);
            unset($taskData['start_date_raw']);
        } else {
            $taskData['start_date'] = null;
        }

        if (!empty($taskData['end_date_raw'])) {
            $taskData['end_date'] = $this->parseDate($taskData['end_date_raw']);
            unset($taskData['end_date_raw']);
        } else {
            $taskData['end_date'] = null;
        }

        if (!empty($taskData['due_date_raw'])) {
            $taskData['due_date'] = $this->parseDate($taskData['due_date_raw']);
            unset($taskData['due_date_raw']);
        } else {
            $taskData['due_date'] = null;
        }

        // 3. Look up project by name
        if (isset($taskData['project_name'])) {
            $projectName = trim($taskData['project_name']);
            if (!empty($projectName)) {
                // Use firstOrCreate to avoid race conditions and duplicates
                $colors = ['#7c4dff', '#ff5252', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#00bcd4'];
                try {
                    $project = Project::firstOrCreate(
                        ['user_id' => $this->userId, 'name' => $projectName],
                        [
                            'color' => $colors[array_rand($colors)],
                            'category' => 'General'
                        ]
                    );
                } catch (\Exception $e) {
                    Log::error("Failed to lookup/create project: $projectName. Error: " . $e->getMessage());
                }
                
                if ($project) {
                    $taskData['project_id'] = $project->id;
                } else {
                    Log::warning("Project could not be found or created for: $projectName");
                }
            }
            unset($taskData['project_name']);
        } else {
            Log::warning("Task data missing project_name for task: " . ($taskData['title'] ?? 'unknown'));
        }

        // 4. Parse Remark to Work Logs
        $workLogs = [];
        if (!empty($taskData['remark'])) {
            $workLogs = $this->parseRemarkToWorkLogs($taskData['remark']);
            if (empty($taskData['description'])) {
                $taskData['description'] = $taskData['remark'];
            }
        }

        // 5. Parse sub-tasks from title
        if (isset($taskData['title']) && str_contains($taskData['title'], "\n")) {
            $lines = preg_split('/\r\n|\r|\n/', $taskData['title']);
            $lines = array_map('trim', $lines);
            $lines = array_filter($lines);

            if (count($lines) > 1) {
                $taskData['title'] = array_shift($lines);
                $subTasks = [];
                foreach ($lines as $line) {
                    $cleanSubTitle = preg_replace('/^[\+\-\*\•\s]*|^\d+[\.\)\s]*/', '', $line);
                    $cleanSubTitle = trim($cleanSubTitle);
                    
                    if (!empty($cleanSubTitle)) {
                        $subTasks[] = [
                            'title' => $cleanSubTitle,
                            'status' => $taskData['status'] ?? 'todo',
                            'priority' => $taskData['priority'] ?? 'medium',
                        ];
                    }
                }
                $taskData['sub_tasks'] = $subTasks;
            }
        }

        // 6. Check if task exists and update or create
        $existingTask = Task::where('user_id', $this->userId)
            ->where('title', $taskData['title'])
            ->where('project_id', $taskData['project_id'] ?? null)
            ->first();

        $taskData['user_id'] = $this->userId;

        if ($existingTask) {
            $this->updateTask($existingTask, array_merge($taskData, ['work_logs' => $workLogs]));
        } else {
            $this->createTask(array_merge($taskData, ['work_logs' => $workLogs]));
        }
    }

    private function createTask(array $data): Task
    {
        $workLogs = $data['work_logs'] ?? [];
        unset($data['work_logs']);

        $subTasks = $data['sub_tasks'] ?? [];
        unset($data['sub_tasks']);
        
        $task = Task::create($data);
        
        $totalMinutes = 0;
        if (!empty($workLogs)) {
            foreach ($workLogs as $log) {
                $task->workLogs()->create($log);
                $totalMinutes += $log['duration_minutes'] ?? 0;
            }
        }

        if ($totalMinutes > 0) {
            $task->update(['work_hours' => round($totalMinutes / 60, 2)]);
        }

        if (!empty($subTasks)) {
            foreach ($subTasks as $subTaskData) {
                $subTaskData['parent_id'] = $task->id;
                $subTaskData['user_id'] = $task->user_id;
                $subTaskData['project_id'] = $task->project_id;
                Task::create($subTaskData);
            }
        }
        
        return $task;
    }

    private function updateTask(Task $task, array $data): bool
    {
        $workLogs = $data['work_logs'] ?? [];
        unset($data['work_logs']);

        $subTasks = $data['sub_tasks'] ?? [];
        unset($data['sub_tasks']);

        $updated = $task->update($data);

        if ($updated) {
            if (!empty($workLogs)) {
                // For work logs, we might want to be careful. 
                // Let's just add new ones for now if they don't exist exactly.
                foreach ($workLogs as $log) {
                    $exists = $task->workLogs()
                        ->where('log_date', $log['log_date'])
                        ->where('description', $log['description'])
                        ->where('duration_minutes', $log['duration_minutes'])
                        ->exists();
                    
                    if (!$exists) {
                        $task->workLogs()->create($log);
                    }
                }

                // Recalculate work_hours
                $totalMinutes = $task->workLogs()->sum('duration_minutes');
                $task->update(['work_hours' => round($totalMinutes / 60, 2)]);
            }

            if (!empty($subTasks)) {
                foreach ($subTasks as $subTaskData) {
                    $exists = Task::where('parent_id', $task->id)
                        ->where('title', $subTaskData['title'])
                        ->exists();
                    
                    if (!$exists) {
                        $subTaskData['parent_id'] = $task->id;
                        $subTaskData['user_id'] = $task->user_id;
                        $subTaskData['project_id'] = $task->project_id;
                        Task::create($subTaskData);
                    }
                }
            }
        }

        return $updated;
    }

    private function parseDate($dateStr): ?string
    {
        if (empty($dateStr)) return null;
        
        // Remove extra spaces and handle cases like '06 . 03 . 2026'
        $dateStr = trim($dateStr);
        Log::debug("Attempting to parse date: '$dateStr'");

        // Handle Excel serial dates (e.g., "46086")
        if (is_numeric($dateStr) && (int)$dateStr > 30000 && (int)$dateStr < 60000) {
            try {
                // Excel dates are number of days since 1900-01-01
                $result = Carbon::createFromTimestamp(($dateStr - 25569) * 86400)->format('Y-m-d H:i:s');
                Log::debug("Date '$dateStr' parsed as Excel serial -> '$result'");
                return $result;
            } catch (\Exception $e) {
                Log::warning("Failed to parse Excel serial date: $dateStr");
            }
        }
        
        // Common formats with . / -
        $formats = [
            'Y-m-d', // Check ISO first as frontend might already have converted it
            'd.m.Y', 'd/m/Y', 'd-m-Y',
            'j.n.Y', 'j/n/Y', 'j-n-Y',
            'm/d/Y', 'm-d-Y',
            'd.m.y', 'd/m/y', 'd-m-y',
            'j.n.y', 'j/n/y', 'j-n-y'
        ];
        
        foreach ($formats as $format) {
            try {
                $carbon = Carbon::createFromFormat($format, $dateStr);
                if ($carbon) {
                    $result = $carbon->format('Y-m-d H:i:s');
                    Log::debug("Date '$dateStr' parsed successfully with format '$format' -> '$result'");
                    return $result;
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        // If all formats fail, try to let Carbon figure it out
        try {
            $result = Carbon::parse($dateStr)->format('Y-m-d H:i:s');
            Log::debug("Date '$dateStr' parsed with Carbon::parse() -> '$result'");
            return $result;
        } catch (\Exception $e) {
            // Last resort: handle d/m/Y manually if Carbon::parse is confused
            if (preg_match('/^(\d{1,2})[\/\. \-](\d{1,2})[\/\. \-](\d{2,4})$/', $dateStr, $m)) {
                try {
                    $year = strlen($m[3]) === 2 ? '20' . $m[3] : $m[3];
                    $result = Carbon::create($year, $m[2], $m[1])->format('Y-m-d H:i:s');
                    Log::debug("Date '$dateStr' parsed manually -> '$result'");
                    return $result;
                } catch (\Exception $ex) {
                    Log::warning("Date '$dateStr' failed manual parsing");
                    return null;
                }
            }
            Log::warning("Date '$dateStr' could not be parsed by any method");
            return null;
        }
    }

    private function parseRemarkToWorkLogs(string $remark): array
    {
        $workLogs = [];
        $lines = preg_split('/\r\n|\r|\n/', $remark);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // Regex for date: description: duration (e.g. 06.03.2026: Task title: 2h)
            // Updated to be more flexible with colons and spaces
            if (preg_match('/^(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})[:\s]+(.*?)(?::\s*|(?:\s+))(\d+(?:\.\d+)?\s*(?:h|m|p|min|hours|minutes)?)$/i', $line, $matches)) {
                $dateStr = $matches[1];
                $description = trim($matches[2]);
                $durationStr = strtolower(trim($matches[3]));
                
                $durationMinutes = $this->parseDurationToMinutes($durationStr);
                $logDate = $this->parseDate($dateStr);
                
                if ($logDate) {
                    $workLogs[] = [
                        'log_date' => Carbon::parse($logDate)->format('Y-m-d'),
                        'description' => $description,
                        'duration_minutes' => $durationMinutes
                    ];
                }
            } elseif (preg_match('/^(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})[:\s]+(.*)$/i', $line, $matches)) {
                $dateStr = $matches[1];
                $description = trim($matches[2]);
                $logDate = $this->parseDate($dateStr);
                
                if ($logDate) {
                    $workLogs[] = [
                        'log_date' => Carbon::parse($logDate)->format('Y-m-d'),
                        'description' => $description,
                        'duration_minutes' => 0
                    ];
                }
            }
        }
        
        return $workLogs;
    }

    private function parseDurationToMinutes(string $durationStr): float
    {
        $durationStr = strtolower(trim($durationStr));
        if (preg_match('/^(\d+(?:\.\d+)?)\s*(h|m|p|min|hours|minutes)?$/', $durationStr, $matches)) {
            $value = (float) $matches[1];
            $unit = $matches[2] ?? 'm';
            if (in_array($unit, ['h', 'hours'])) {
                return $value * 60;
            } else {
                return $value;
            }
        }
        return 0;
    }
}
