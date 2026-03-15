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
            // Re-assert status check constraint
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_status_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_status_check CHECK (status IN (\'todo\', \'in_progress\', \'done\', \'on_hold\'))');
            
            // Re-assert priority check constraint
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_priority_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN (\'low\', \'medium\', \'high\', \'urgent\'))');
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                // In MySQL, we can't easily change back to enum if data is already there with new values, 
                // but since we moved to string earlier, we can just keep it as string.
                // However, to be consistent with earlier migrations that might have failed to drop enums correctly:
                $table->string('status')->default('todo')->change();
                $table->string('priority')->default('medium')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to revert to restrictive constraints in down as it might break existing data
    }
};
