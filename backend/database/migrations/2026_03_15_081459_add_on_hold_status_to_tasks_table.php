<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            // Fix status constraint
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_status_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_status_check CHECK (status IN (\'todo\', \'in_progress\', \'done\', \'on_hold\'))');
            
            // Fix priority constraint (ensure urgent is included if it was lost during string change)
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_priority_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN (\'low\', \'medium\', \'high\', \'urgent\'))');
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                $table->enum('status', ['todo', 'in_progress', 'done', 'on_hold'])->default('todo')->change();
                $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_status_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_status_check CHECK (status IN (\'todo\', \'in_progress\', \'done\'))');
            
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_priority_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN (\'low\', \'medium\', \'high\'))');
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo')->change();
                $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->change();
            });
        }
    }
};
