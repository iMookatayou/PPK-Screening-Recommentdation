<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AdminUserController extends Controller
{
    /**
     * GET /api/admin/users/pending
     * Query: ?page=1&per_page=20&q=keyword
     */
    public function getPendingUsers(Request $request)
    {
        $data = $request->validate([
            'page'     => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'q'        => 'sometimes|string|max:100',
        ]);

        $perPage = (int)($data['per_page'] ?? 20);
        $q       = trim((string)($data['q'] ?? ''));

        $query = User::query()
            ->where('status', 'pending')
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where(function ($qq) use ($q) {
                    $qq->where('first_name', 'like', "%{$q}%")
                       ->orWhere('last_name', 'like', "%{$q}%")
                       ->orWhere('email', 'like', "%{$q}%")
                       ->orWhere('cid', 'like', "%{$q}%");
                });
            })
            ->orderByDesc('created_at')
            ->select(['id','cid','first_name','last_name','email','status','created_at']);

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ], 200);
    }

    /**
     * PUT /api/admin/users/{user}/approve
     */
        public function approveUser(Request $request, $id)
        {
            $user = User::findOrFail($id);

            if ((int)$request->user()->id === (int)$user->id) {
                return response()->json([
                    'message' => 'ไม่สามารถอนุมัติ/แก้สถานะของตนเองได้',
                    'code'    => 'SELF_ACTION_FORBIDDEN',
                ], 403);
            }

            if ($user->status === 'approved') {
                return response()->json([
                    'message' => 'ผู้ใช้นี้ได้รับการอนุมัติแล้ว',
                    'code'    => 'NO_OP',
                    'user'    => $user->only(['id','cid','first_name','last_name','email','status','approved_at']),
                ], 200);
            }

            if ($user->status === 'rejected') {
                Log::warning('[ADMIN] approve previously rejected user', ['id' => $user->id]);
            }

            $user->forceFill([
                'status'          => 'approved',
                'approved_at'     => now(config('app.timezone', 'Asia/Bangkok')),
                'rejected_reason' => null,
            ])->save();

            return response()->json([
                'message' => 'อนุมัติผู้ใช้สำเร็จ',
                'code'    => 'APPROVED',
                'user'    => $user->only(['id','cid','first_name','last_name','email','status','approved_at']),
            ], 200);
        }

        public function rejectUser(Request $request, $id)
        {
            $user = User::findOrFail($id);

            if ((int)$request->user()->id === (int)$user->id) {
                return response()->json([
                    'message' => 'ไม่สามารถปฏิเสธบัญชีของตนเองได้',
                    'code'    => 'SELF_ACTION_FORBIDDEN',
                ], 403);
            }

            $data = $request->validate([
                'reason' => 'nullable|string|max:255',
            ]);

            if ($user->status === 'rejected') {
                return response()->json([
                    'message' => 'ผู้ใช้นี้ถูกปฏิเสธไปแล้ว',
                    'code'    => 'NO_OP',
                    'user'    => $user->only(['id','cid','first_name','last_name','email','status','rejected_reason']),
                ], 200);
            }

            $user->forceFill([
                'status'          => 'rejected',
                'approved_at'     => null,
                'rejected_reason' => $data['reason'] ?? null,
            ])->save();

            try {
                $user->tokens()->delete();
            } catch (\Throwable $e) {
                Log::error('[ADMIN] revoke tokens on reject failed', [
                    'user_id' => $user->id,
                    'err'     => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'ปฏิเสธผู้ใช้สำเร็จ',
                'code'    => 'REJECTED',
                'user'    => $user->only(['id','cid','first_name','last_name','email','status','rejected_reason']),
            ], 200);
        }

}
