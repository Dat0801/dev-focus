<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function updatePomodoroSettings(Request $request): JsonResponse
    {
        $request->validate([
            'pomodoro_focus_duration' => 'required|integer|min:1|max:60',
            'pomodoro_break_duration' => 'required|integer|min:1|max:30',
        ]);

        $user = $request->user();
        $user->update([
            'pomodoro_focus_duration' => $request->pomodoro_focus_duration,
            'pomodoro_break_duration' => $request->pomodoro_break_duration,
        ]);

        return response()->json([
            'message' => 'Pomodoro settings updated successfully',
            'user' => $user
        ]);
    }
}
