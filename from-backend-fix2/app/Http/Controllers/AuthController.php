<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * POST /api/register
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cid'        => ['required', 'digits:13', 'unique:users,cid'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'email'      => ['nullable', 'email', Rule::unique('users', 'email')],
            'password'   => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], [], [
            'cid'        => 'เลขบัตรประชาชน',
            'first_name' => 'ชื่อ',
            'last_name'  => 'นามสกุล',
            'email'      => 'อีเมล',
            'password'   => 'รหัสผ่าน',
        ]);

        if ($validator->fails()) {
            Log::warning('[REGISTER] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => $request->all(),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        try {
            $user = User::create([
                'cid'        => $data['cid'],
                'first_name' => $data['first_name'],
                'last_name'  => $data['last_name'],
                'email'      => $data['email'] ?? null,
                'password'   => $data['password'],
                'role'       => 'user',
                'status'     => 'pending',
            ]);

            Log::info('[REGISTER] New pending user created', [
                'user_id' => $user->id,
                'cid'     => $user->cid,
                'email'   => $user->email,
            ]);

            return response()->json([
                'message' => 'สมัครสำเร็จ กำลังรอผู้ดูแลระบบอนุมัติ',
                'user'    => $user->only(['id', 'cid', 'first_name', 'last_name', 'email', 'role', 'status']),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('[REGISTER ERROR]', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการสมัคร กรุณาลองใหม่ภายหลัง'], 500);
        }
    }

    /**
     * POST /api/login-token
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cid'      => ['required', 'digits:13'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            Log::warning('[LOGIN] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => $request->all(),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $user = User::where('cid', $data['cid'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            Log::notice('[LOGIN] Invalid credentials', ['cid' => $data['cid']]);
            return response()->json(['message' => 'เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง'], 401);
        }

        if ($user->status !== 'approved') {
            Log::notice('[LOGIN] User not approved', [
                'cid'    => $user->cid,
                'status' => $user->status,
            ]);

            return response()->json([
                'message' => $user->status === 'pending'
                    ? 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ'
                    : 'บัญชีถูกปฏิเสธการอนุมัติ',
                'code'    => $user->status === 'pending' ? 'PENDING' : 'REJECTED',
            ], 403);
        }

        $plainToken = $user->createOrReuseDailyToken('auth_token', ['*']);

        Log::info('[LOGIN] User logged in', ['cid' => $user->cid]);

        return response()->json([
            'message'    => 'เข้าสู่ระบบสำเร็จ',
            'user'       => $user->only(['id', 'cid', 'first_name', 'last_name', 'email', 'role', 'status']),
            'token'      => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => now(config('app.timezone', 'Asia/Bangkok'))->endOfDay()->toISOString(),
        ]);
    }

    /**
     * GET /api/me
     */
    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            Log::warning('[ME] Unauthenticated access attempt');
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json($user->only([
            'id', 'cid', 'first_name', 'last_name', 'email', 'role', 'status'
        ]));
    }

    /**
     * PUT /api/user
     */
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            Log::warning('[UPDATE] Unauthenticated update attempt');
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name'  => ['sometimes', 'string', 'max:255'],
            'email'      => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password'   => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        if ($validator->fails()) {
            Log::warning('[UPDATE] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => $request->all(),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // ถ้ามี password ให้บันทึกใหม่ (mutator จัดการ hash)
        if (!empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->fill(collect($data)->except('password')->toArray());
        $user->save();

        Log::info('[UPDATE] User updated info', ['user_id' => $user->id]);

        return response()->json([
            'message' => 'แก้ไขข้อมูลผู้ใช้สำเร็จ',
            'user'    => $user->only(['id', 'cid', 'first_name', 'last_name', 'email', 'role', 'status']),
        ]);
    }

    /**
     * POST /api/logout-token
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->revokeTokenByName('auth_token');
            Log::info('[LOGOUT] Token revoked', ['user_id' => $user->id]);
        } else {
            Log::warning('[LOGOUT] Attempted logout without user');
        }

        return response()->json(['message' => 'ออกจากระบบแล้ว']);
    }
}
