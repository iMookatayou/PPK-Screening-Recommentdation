<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AdminUserController extends Controller
{
    /**
     * สร้าง payload มาตรฐานสำหรับ Popup ฝั่ง Frontend
     *
     * @param  User   $user
     * @param  string $code   เช่น ALLOW_REAPPLY | CONTACT_ADMIN | APPROVED | REJECTED | NO_OP | INVALID_STATUS | SELF_ACTION_FORBIDDEN | USE_REAPPLY_FLOW
     * @param  string $message
     * @param  array  $extra  ['reason'=>?, 'user_hint'=>?, 'reapply_until'=>?, 'actions'=>[...]]
     * @param  int    $httpStatus
     */
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

    /**
     * GET /api/admin/users
     */
    public function index(Request $request)
    {
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

        // ---- date range (Asia/Bangkok by default) ----
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

        // ---- safe sort ----
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

        // ---- base filter (shared by list + counts) ----
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

        // ---- list query ----
        $query = (clone $base)
            ->when($status !== 'all', fn ($qb) => $qb->where('status', $status))
            ->orderBy($sortCol, $dir)
            ->select([
                'id','cid','first_name','last_name','email','status','created_at',
                // FE ต้องใช้เพิ่ม
                'rejected_reason','reapply_allowed','reapply_until','approved_at',
            ]);

        $paginator = $query->paginate($perPage);

        // ---- counts (respect q/from/to; ignore status) ----
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

    /**
     * (Legacy) GET /api/admin/users/pending
     */
    public function getPendingUsers(Request $request)
    {
        $request->merge(['status' => 'pending']);
        return $this->index($request);
    }

    /**
     * PUT /api/admin/users/{id}/approve
     */
    public function approveUser(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Unauthenticated', 'code' => 'UNAUTHENTICATED'], 401);
        }

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

        // กันเคสอนุมัติ user ที่ถูกปฏิเสธ → ให้ใช้ flow อนุญาตสมัครใหม่แทน
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

        DB::transaction(function () use ($user) {
            $user->forceFill([
                'status'          => 'approved',
                'approved_at'     => now(config('app.timezone', 'Asia/Bangkok')),
                'rejected_reason' => null,
                'reapply_allowed' => false,
                'reapply_until'   => null,
            ])->save();
        });

        return $this->respondPopup(
            $user,
            'APPROVED',
            'อนุมัติผู้ใช้สำเร็จ',
            ['actions' => [['key'=>'CLOSE','label'=>'ปิด']]],
            200
        );
    }

    /**
     * PUT /api/admin/users/{id}/reject
     * Body: { reason?: string }
     */
    public function rejectUser(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Unauthenticated', 'code' => 'UNAUTHENTICATED'], 401);
        }

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

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        // เดิม rejected → อัปเดตเหตุผลได้
        if ($user->status === 'rejected') {
            $user->forceFill([
                'rejected_reason' => $data['reason'] ?? $user->rejected_reason,
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

        DB::transaction(function () use ($user, $data) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => null,
                'rejected_reason' => $data['reason'] ?? null,
                'reapply_allowed' => false,
                'reapply_until'   => null,
            ])->save();

            try { $user->tokens()->delete(); } catch (\Throwable $e) {}
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

    /**
     * PUT /api/admin/users/{id}/allow-reapply
     * ใช้กับเคส rejected เท่านั้น
     * Body (optional): { allow_days?: number } → ถ้ากำหนดวัน จะคงสถานะ rejected + เปิดสิทธิ์สมัครใหม่จนถึงวันหมดสิทธิ์
     */
    public function allowReapply(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Unauthenticated', 'code' => 'UNAUTHENTICATED'], 401);
        }

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
        $until = $allowDays ? Carbon::now($tz)->addDays($allowDays) : null;

        DB::transaction(function () use ($user, $until) {
            // คงสถานะ rejected และเปิดสิทธิ์สมัครใหม่ (ตามแนวคิดให้ล็อกอินแล้วเจอ ALLOW_REAPPLY)
            $user->forceFill([
                'status'          => 'rejected',
                'reapply_allowed' => true,
                'reapply_until'   => $until,
            ])->save();

            try { $user->tokens()->delete(); } catch (\Throwable $e) {}
        });

        return $this->respondPopup(
            $user,
            'ALLOW_REAPPLY',
            'เปิดสิทธิ์ให้ผู้ใช้นี้สามารถ “สมัครใหม่” ได้แล้ว',
            [
                'user_hint'     => 'ผู้ใช้ต้องไปหน้า “สมัครสมาชิก” และใช้เลขบัตรเดิม',
                'reapply_until' => $until?->toIso8601String(),
                'actions' => [
                    ['key'=>'CLOSE','label'=>'ปิด'],
                ],
            ],
            200
        );
    }

    /**
     * PUT /api/admin/users/{id}/block-reapply
     * Body: { reason?: string }
     * ตรึงสถานะเป็น rejected พร้อมเหตุผล และปิดสิทธิ์สมัครใหม่
     */
    public function blockReapply(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Unauthenticated', 'code' => 'UNAUTHENTICATED'], 401);
        }

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

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($user, $data) {
            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => null,
                'rejected_reason' => $data['reason'] ?? 'Blocked from re-apply',
                'reapply_allowed' => false,
                'reapply_until'   => null,
            ])->save();

            try { $user->tokens()->delete(); } catch (\Throwable $e) {}
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
}
