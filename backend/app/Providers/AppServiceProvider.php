<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Interfaces\TaskRepositoryInterface::class,
            \App\Repositories\TaskRepository::class
        );
        $this->app->bind(
            \App\Interfaces\ProjectRepositoryInterface::class,
            \App\Repositories\ProjectRepository::class
        );
        $this->app->bind(
            \App\Interfaces\PomodoroRepositoryInterface::class,
            \App\Repositories\PomodoroRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
