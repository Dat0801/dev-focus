<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->change();
            $table->integer('estimated_pomodoros')->default(1)->after('work_hours');
            $table->integer('completed_pomodoros')->default(0)->after('estimated_pomodoros');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'work_hours', 'estimated_pomodoros', 'completed_pomodoros']);
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->change();
        });
    }
};
