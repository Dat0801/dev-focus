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
        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('start_date')->nullable()->after('due_date');
            $table->timestamp('end_date')->nullable()->after('start_date');
            $table->decimal('work_hours', 8, 2)->nullable()->after('end_date');
            $table->integer('estimated_pomodoros')->default(1)->after('work_hours');
            $table->integer('completed_pomodoros')->default(0)->after('estimated_pomodoros');
        });

        // PostgreSQL fix for changing enum (which is varchar + check constraint in Laravel/PG)
        if (config('database.default') === 'pgsql') {
            // Re-assert column properties without the check constraint to avoid syntax error
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('priority')->default('medium')->change();
            });
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_priority_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN (\'low\', \'medium\', \'high\', \'urgent\'))');
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'work_hours', 'estimated_pomodoros', 'completed_pomodoros']);
        });

        if (config('database.default') === 'pgsql') {
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('priority')->default('medium')->change();
            });
            DB::statement('ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_priority_check');
            DB::statement('ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN (\'low\', \'medium\', \'high\'))');
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->change();
            });
        }
    }
};
