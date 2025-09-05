<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Carbon\Carbon;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AdminUserController extends Controller implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('auth:sanctum'),
            new Middleware('throttle:120,1', only: [
                'approveUser','rejectUser','allowReapply','blockReapply','destroy'
            ]),
        ];
    }


    /* =========================
     * Sentinel (ไม่ใช้ NULL)
     * ========================= */
    protected function epochDateTime(): string { return '1970-01-01 00:00:01'; }
    protected function epochDate(): string     { return '1970-01-01'; }
    protected function emptyStr(): string      { return ''; }

    /* =========================
     * Helpers
     * ========================= */

    /** เช็คว่า target เป็นแอดมินหรือไม่ (อ่าน attribute ตรง ๆ ให้ถูกกับ Eloquent) */
    protected function isAdmin(User $u): bool
    {
        $role = $u->getAttribute('role');
        if ($role === 'admin') return true;

        // เผื่อมีฟิลด์ is_admin ในสคีมาเก่า
        $isAdmin = $u->getAttribute('is_admin');
        return (bool) $isAdmin;
    }

    /** บังคับว่า actor ต้องเป็น admin */
    protected function assertActorIsAdmin(Request $request): ?JsonResponse
    {
        $actor = $request->user(); // ทำงานได้ทั้ง sanctum cookie และ token
        if (!$actor) {
            return response()->json(['message' => 'Unauthenticated', 'code' => 'UNAUTHENTICATED'], 401);
        }
        if (!$this->isAdmin($actor)) {
            return response()->json(['message' => 'Forbidden', 'code' => 'FORBIDDEN_NOT_ADMIN'], 403);
        }
        return null;
    }

    /** ลบโทเคนแบบปลอดภัย (กรณีไม่ได้ใช้ Sanctum PAT จะไม่มีเมธอด tokens()) */
    protected function safeDeleteTokens(User $user): void
    {
        try {
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete(); // Personal Access Tokens (กรณีบางระบบยังใช้)
            }
        } catch (\Throwable $e) {
            Log::warning('safeDeleteTokens failed', [
                'user_id' => $user->id,
                'err'     => $e->getMessage(),
            ]);
        }
    }

    /**
     * เคลียร์ session อื่น ๆ ของผู้ใช้ (สำหรับ Sanctum cookie + session driver = database)
     * - ต้องตั้ง SESSION_DRIVER=database และรันตาราง sessions แล้ว
     * - จะคง session ปัจจุบันของแอดมินไว้ (ป้องกันเตะตัวเองหลุด)
     */
    protected function tryInvalidateUserSessions(User $user, ?Request $request = null): void
    {
        try {
            if (Config::get('session.driver') !== 'database') {
                return; // ถ้าไม่ใช่ database ก็ข้าม
            }

            $currentSessionId = null;
            if ($request && $request->hasSession()) {
                $currentSessionId = $request->session()->getId();
            }

            DB::table('sessions')
                ->when($currentSessionId, fn($q) => $q->where('id', '!=', $currentSessionId))
                ->where('user_id', (string) $user->getAuthIdentifier())
                ->delete();
        } catch (\Throwable $e) {
            Log::warning('tryInvalidateUserSessions failed', [
                'user_id' => $user->id,
                'err'     => $e->getMessage(),
            ]);
        }
    }

    /** payload สำหรับแสดง Popup ฝั่ง FE */
    protected function respondPopup(User $user, string $code, string $message, array $extra = [], int $httpStatus = 200): JsonResponse
    {
        $payload = [
            'code'    => $code,
            'message' => $message,
            'user'    => $user->only(['id','cid','first_name','last_name','email','status']),
        ];

        foreach (['reason','user_hint','reapply_until','actions'] as $k) {
            if (array_key_exists($k, $extra) && !is_null($extra[$k])) {
                $payload[$k] = $extra[$k];
            }
        }

        return response()->json($payload, $httpStatus);
    }

    /* =========================
     * GET /api/admin/users
     * ========================= */
    public function index(Request $request)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $data = $request->validate([
            'page'     => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'q'        => 'sometimes|nullable|string|max:100',
            'status'   => ['sometimes', Rule::in(['all','pending','approved','rejected'])],
            'from'     => 'sometimes|nullable|date_format:Y-m-d',
            'to'       => 'sometimes|nullable|date_format:Y-m-d',
            'sort'     => ['sometimes', Rule::in(['created_at','first_name','last_name','email','cid','status'])],
            'dir'      => ['sometimes', Rule::in(['asc','desc'])],
        ]);

        $perPage = (int)($data['per_page'] ?? 20);
        $q       = trim((string)($data['q'] ?? ''));
        $status  = $data['status'] ?? 'all';
        $sort    = $data['sort']   ?? 'created_at';
        $dir     = $data['dir']    ?? 'desc';

        $tz   = config('app.timezone', 'Asia/Bangkok');
        $from = $data['from'] ?? null;
        $to   = $data['to']   ?? null;

        if ($from && !$to) { $to = $from; }
        if ($to && !$from) { $from = $to; }
        if ($from && $to && $from > $to) { [$from, $to] = [$to, $from]; }

        $start = $end = null;
        if ($from && $to) {
            $start = Carbon::parse($from, $tz)->startOfDay();
            $end   = Carbon::parse($to,   $tz)->endOfDay();
        }

        $sortable = [
            'created_at' => 'created_at',
            'first_name' => 'first_name',
            'last_name'  => 'last_name',
            'email'      => 'email',
            'cid'        => 'cid',
            'status'     => 'status',
        ];
        $sortCol = $sortable[$sort] ?? 'created_at';
        $dir     = $dir === 'asc' ? 'asc' : 'desc';

        $base = User::query()
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where(function ($qq) use ($q) {
                    $qq->where('first_name', 'like', "%{$q}%")
                       ->orWhere('last_name',  'like', "%{$q}%")
                       ->orWhere('email',      'like', "%{$q}%")
                       ->orWhere('cid',        'like', "%{$q}%");
                });
            })
            ->when(isset($start, $end), fn ($qb) => $qb->whereBetween('created_at', [$start, $end]));

        $query = (clone $base)
            ->when($status !== 'all', fn ($qb) => $qb->where('status', $status))
            ->orderBy($sortCol, $dir)
            ->select([
                'id','cid','first_name','last_name','email','status','created_at',
                'rejected_reason','reapply_allowed','reapply_until','approved_at',
            ]);

        $paginator = $query->paginate($perPage);

        $rawCounts = (clone $base)
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $counts = [
            'all'      => array_sum($rawCounts),
            'pending'  => $rawCounts['pending']  ?? 0,
            'approved' => $rawCounts['approved'] ?? 0,
            'rejected' => $rawCounts['rejected'] ?? 0,
        ];

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page'   => $paginator->currentPage(),
                'per_page'       => $paginator->perPage(),
                'total'          => $paginator->total(),
                'last_page'      => $paginator->lastPage(),
                'applied_range'  => isset($start, $end) ? [
                    'from' => $start->toDateString(),
                    'to'   => $end->toDateString(),
                ] : null,
                'sort'           => $sortCol,
                'dir'            => $dir,
                'status_filter'  => $status,
                'q'              => $q !== '' ? $q : null,
            ],
            'counts' => $counts,
        ], 200);
    }

    public function getPendingUsers(Request $request)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;
        $request->merge(['status' => 'pending']);
        return $this->index($request);
    }

    /* =========================
     * PUT /api/admin/users/{id}/approve
     * ========================= */
    public function approveUser(Request $request, $id)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $actor = $request->user();
        $user = User::findOrFail($id);

        if ((int)$actor->id === (int)$user->id) {
            return $this->respondPopup(
                $user,
                'SELF_ACTION_FORBIDDEN',
                'ไม่สามารถอนุมัติ/แก้สถานะของตนเองได้',
                ['actions' => [['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local']]],
                403
            );
        }

        if ($this->isAdmin($user)) {
            return $this->respondPopup(
                $user,
                'TARGET_IS_ADMIN_FORBIDDEN',
                'ไม่สามารถปรับสถานะของผู้ดูแลระบบได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        if ($user->status === 'rejected') {
            return $this->respondPopup(
                $user,
                'USE_REAPPLY_FLOW',
                'ผู้ใช้นี้ถูกปฏิเสธแล้ว กรุณาใช้ขั้นตอน “อนุญาตให้สมัครใหม่”',
                [
                    'reason'  => $user->rejected_reason,
                    'actions' => [['key'=>'CLOSE','label'=>'ปิด']],
                ],
                409
            );
        }

        if ($user->status === 'approved') {
            return $this->respondPopup(
                $user,
                'NO_OP',
                'ผู้ใช้นี้ได้รับการอนุมัติแล้ว',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                200
            );
        }

        DB::transaction(function () use ($user, $request) {
            $user->forceFill([
                'status'          => 'approved',
                'approved_at'     => now(config('app.timezone', 'Asia/Bangkok')),
                'rejected_reason' => $this->emptyStr(),
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
            $this->tryInvalidateUserSessions($user, $request);
        });

        return $this->respondPopup(
            $user,
            'APPROVED',
            'อนุมัติผู้ใช้สำเร็จ',
            ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
            200
        );
    }

    /* =========================
     * PUT /api/admin/users/{id}/reject
     * ========================= */
    public function rejectUser(Request $request, $id)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $actor = $request->user();
        $user = User::findOrFail($id);

        if ((int)$actor->id === (int)$user->id) {
            return $this->respondPopup(
                $user,
                'SELF_ACTION_FORBIDDEN',
                'ไม่สามารถปฏิเสธบัญชีของตนเองได้',
                ['actions' => [['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local']]],
                403
            );
        }

        if ($this->isAdmin($user)) {
            return $this->respondPopup(
                $user,
                'TARGET_IS_ADMIN_FORBIDDEN',
                'ไม่สามารถปรับสถานะของผู้ดูแลระบบได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        if ($user->status === 'rejected') {
            $user->forceFill([
                'rejected_reason' => $data['reason'] ?? $user->rejected_reason ?? $this->emptyStr(),
            ])->save();

            return $this->respondPopup(
                $user,
                'REJECTED_UPDATED',
                'อัปเดตเหตุผลการปฏิเสธเรียบร้อย',
                [
                    'reason'  => $user->rejected_reason,
                    'actions' => [['key'=>'CLOSE','label'=>'ปิด']],
                ],
                200
            );
        }

        DB::transaction(function () use ($user, $data, $request) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => $this->epochDateTime(),
                'rejected_reason' => $data['reason'] ?? $this->emptyStr(),
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
            $this->tryInvalidateUserSessions($user, $request);
        });

        return $this->respondPopup(
            $user,
            'REJECTED',
            'ปฏิเสธผู้ใช้สำเร็จ',
            [
                'reason'  => $user->rejected_reason,
                'actions' => [
                    ['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local'],
                    ['key'=>'CLOSE','label'=>'ปิด'],
                ],
            ],
            200
        );
    }

    /* =========================
     * PUT /api/admin/users/{id}/allow-reapply
     * ========================= */
    public function allowReapply(Request $request, $id)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $actor = $request->user();
        $user = User::findOrFail($id);

        if ((int)$actor->id === (int)$user->id) {
            return $this->respondPopup(
                $user,
                'SELF_ACTION_FORBIDDEN',
                'ไม่สามารถปรับสถานะของตนเองได้',
                ['actions' => [['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local']]],
                403
            );
        }

        if ($this->isAdmin($user)) {
            return $this->respondPopup(
                $user,
                'TARGET_IS_ADMIN_FORBIDDEN',
                'ไม่สามารถปรับสถานะของผู้ดูแลระบบได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        if ($user->status !== 'rejected') {
            return $this->respondPopup(
                $user,
                'INVALID_STATUS',
                'อนุญาตสมัครใหม่ได้เฉพาะผู้ใช้ที่ถูกปฏิเสธเท่านั้น',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                422
            );
        }

        $allowDays = $request->integer('allow_days'); // optional
        $tz = config('app.timezone', 'Asia/Bangkok');

        $untilCarbon = $allowDays ? Carbon::now($tz)->addDays($allowDays) : null;
        $untilStr = $untilCarbon ? $untilCarbon->toDateString() : $this->epochDate();

        DB::transaction(function () use ($user, $untilStr, $request) {
            $user->forceFill([
                'status'          => 'rejected',
                'reapply_allowed' => true,
                'reapply_until'   => $untilStr,
            ])->save();

            $this->safeDeleteTokens($user);
            $this->tryInvalidateUserSessions($user, $request);
        });

        return $this->respondPopup(
            $user,
            'ALLOW_REAPPLY',
            'เปิดสิทธิ์ให้ผู้ใช้นี้สามารถ “สมัครใหม่” ได้แล้ว',
            [
                'user_hint'     => 'ผู้ใช้ต้องไปหน้า “สมัครสมาชิก” และใช้เลขบัตรเดิม',
                'reapply_until' => $untilCarbon?->toIso8601String(),
                'actions'       => [
                    ['key'=>'CLOSE','label'=>'ปิด'],
                ],
            ],
            200
        );
    }

    /* =========================
     * PUT /api/admin/users/{id}/block-reapply
     * ========================= */
    public function blockReapply(Request $request, $id)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $actor = $request->user();
        $user = User::findOrFail($id);

        if ((int)$actor->id === (int)$user->id) {
            return $this->respondPopup(
                $user,
                'SELF_ACTION_FORBIDDEN',
                'ไม่สามารถปรับสถานะของตนเองได้',
                ['actions' => [['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local']]],
                403
            );
        }

        if ($this->isAdmin($user)) {
            return $this->respondPopup(
                $user,
                'TARGET_IS_ADMIN_FORBIDDEN',
                'ไม่สามารถปรับสถานะของผู้ดูแลระบบได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($user, $data, $request) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => $this->epochDateTime(),
                'rejected_reason' => $data['reason'] ?? 'Blocked from re-apply',
                'reapply_allowed' => false,
                'reapply_until'   => $this->epochDate(),
            ])->save();

            $this->safeDeleteTokens($user);
            $this->tryInvalidateUserSessions($user, $request);
        });

        return $this->respondPopup(
            $user,
            'BLOCK_REAPPLY',
            'บล็อคการสมัครใหม่แล้ว (สถานะถูกปฏิเสธ)',
            [
                'reason'  => $user->rejected_reason,
                'actions' => [
                    ['key'=>'CONTACT','label'=>'ติดต่อแอดมิน','url'=>'mailto:admin@hospital.local'],
                    ['key'=>'CLOSE','label'=>'ปิด'],
                ],
            ],
            200
        );
    }

    /* =========================
     * DELETE /api/admin/users/{id}
     * กันลบตัวเอง + กันลบแอดมิน
     * ========================= */
    public function destroy(Request $request, $id)
    {
        if ($resp = $this->assertActorIsAdmin($request)) return $resp;

        $actor = $request->user();
        $user = User::findOrFail($id);

        // ห้ามลบตัวเอง
        if ((int)$actor->id === (int)$user->id) {
            return $this->respondPopup(
                $user,
                'SELF_DELETE_FORBIDDEN',
                'ไม่สามารถลบบัญชีของตนเองได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        // ห้ามลบแอดมิน
        if ($this->isAdmin($user)) {
            return $this->respondPopup(
                $user,
                'TARGET_IS_ADMIN_FORBIDDEN',
                'ไม่สามารถลบบัญชีผู้ดูแลระบบได้',
                ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
                403
            );
        }

        // เตะออกจากระบบทั้งหมด
        $this->safeDeleteTokens($user);
        $this->tryInvalidateUserSessions($user, $request);

        $user->delete(); // ถ้าใช้ SoftDeletes จะเป็น soft delete

        return response()->json([
            'code'    => 'DELETED',
            'message' => 'ลบผู้ใช้สำเร็จ',
            'user'    => $user->only(['id','cid','first_name','last_name','email','status']),
        ], 200);
    }
}
