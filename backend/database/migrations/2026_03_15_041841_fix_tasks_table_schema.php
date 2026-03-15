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
            $table->text('title')->change();
            $table->string('status')->default('todo')->change(); // Use string instead of enum for more flexibility
            $table->string('priority')->default('medium')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('title', 255)->change();
            $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo')->change();
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->change();
        });
    }
};
