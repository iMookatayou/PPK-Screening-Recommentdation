<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AdminUserService
{
    /* Sentinel (ไม่ใช้ NULL) */
    protected function epochDateTime(): string { return '1970-01-01 00:00:01'; }
    protected function epochDate(): string     { return '1970-01-01'; }
    protected function emptyStr(): string      { return ''; }

    protected function safeDeleteTokens(User $user): void
    {
        try {
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('safeDeleteTokens failed', ['user_id' => $user->id, 'err' => $e->getMessage()]);
        }
    }

    public function approve(User $user): User
    {
        DB::transaction(function () use ($user) {
            $user->forceFill([
                'status'          => 'approved',
                'approved_at'     => now(config('app.timezone', 'Asia/Bangkok')),
                'rejected_reason' => $this->emptyStr(),
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
        });

        return $user->refresh();
    }

    public function reject(User $user, ?string $reason): User
    {
        DB::transaction(function () use ($user, $reason) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => $this->epochDateTime(),
                'rejected_reason' => $reason ?? $this->emptyStr(),
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
        });

        return $user->refresh();
    }

    public function updateRejectReason(User $user, ?string $reason): User
    {
        $user->forceFill([
            'rejected_reason' => $reason ?? $user->rejected_reason ?? $this->emptyStr(),
        ])->save();

        return $user->refresh();
    }

    public function allowReapply(User $user, ?int $allowDays): array
    {
        $tz = config('app.timezone', 'Asia/Bangkok');
        $untilCarbon = $allowDays ? Carbon::now($tz)->addDays($allowDays) : null;
        $untilStr = $untilCarbon ? $untilCarbon->toDateString() : $this->epochDate();

        DB::transaction(function () use ($user, $untilStr) {
            $user->forceFill([
                'status'          => 'rejected', // คงสถานะ rejected
                'reapply_allowed' => true,
                'reapply_until'   => $untilStr,
            ])->save();

            $this->safeDeleteTokens($user);
        });

        return [$user->refresh(), $untilCarbon];
    }

    public function blockReapply(User $user, ?string $reason): User
    {
        DB::transaction(function () use ($user, $reason) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => $this->epochDateTime(),
                'rejected_reason' => $reason ?? 'Blocked from re-apply',
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
        });

        return $user->refresh();
    }

    public function destroy(User $user): void
    {
        $this->safeDeleteTokens($user);
        $user->delete(); // ถ้าเปิด SoftDeletes จะ soft delete
    }
}
