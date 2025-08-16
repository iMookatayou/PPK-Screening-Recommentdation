<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Database\QueryException;
use Carbon\Carbon;

class AuthController extends Controller
{
    /** helper: ยังอยู่ในช่วงเปิดสิทธิ์สมัครใหม่หรือไม่ */
    protected function isReapplyWindowOpen(User $u): bool
    {
        if (!$u->reapply_allowed) return false;
        if (empty($u->reapply_until)) return true; // อนุญาตแบบไม่กำหนดวันหมดเขต
        return Carbon::now(config('app.timezone', 'Asia/Bangkok'))
            ->lte(Carbon::parse($u->reapply_until));
    }

    /**
     * POST /api/register
     */
    public function register(Request $request)
    {
        // 1) Validate (ยังไม่ unique:cid เพื่อควบคุมข้อความตอบเอง)
        $validator = Validator::make($request->all(), [
            'cid'        => ['required', 'digits:13'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'email'      => ['nullable', 'email', Rule::unique('users', 'email')],
            'password'   => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], [
            'cid.required'        => 'กรุณากรอกเลขบัตรประชาชน',
            'cid.digits'          => 'เลขบัตรประชาชนต้องมี 13 หลัก',
            'first_name.required' => 'กรุณากรอกชื่อ',
            'last_name.required'  => 'กรุณากรอกนามสกุล',
            'email.email'         => 'รูปแบบอีเมลไม่ถูกต้อง',
            'email.unique'        => 'อีเมลนี้ถูกใช้แล้ว',
            'password.required'   => 'กรุณากรอกรหัสผ่าน',
            'password.confirmed'  => 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
            'password.min'        => 'รหัสผ่านอย่างน้อย 8 ตัวอักษร',
        ]);

        if ($validator->fails()) {
            Log::warning('[REGISTER] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => $request->all(),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // 2) ตรวจเชิงธุรกิจจาก cid
        if ($existing = User::where('cid', $data['cid'])->first()) {
            Log::notice('[REGISTER] CID exists', [
                'cid'    => $data['cid'],
                'status' => $existing->status,
                'reapply_allowed' => $existing->reapply_allowed,
                'reapply_until'   => $existing->reapply_until,
            ]);

            // เคส re-apply: อนุญาตให้ "สมัครใหม่" ซ้ำบน record เดิม
            if ($existing->status === 'rejected' && $this->isReapplyWindowOpen($existing)) {
                $existing->forceFill([
                    'first_name'      => $data['first_name'],
                    'last_name'       => $data['last_name'],
                    'email'           => $data['email'] ?? null,
                    'password'        => $data['password'], // mutator จะ hash ให้
                    'status'          => 'pending',
                    'approved_at'     => null,
                    'rejected_reason' => null,
                    'reapply_allowed' => false,
                    'reapply_until'   => null,
                ])->save();

                return response()->json([
                    'code'    => 'REGISTERED_PENDING',
                    'message' => 'สมัครสำเร็จ ระบบจะตรวจสอบและอนุมัติ โปรดเข้าสู่ระบบภายหลัง',
                    'user'    => $existing->only(['id','cid','first_name','last_name','email','role','status']),
                ], 201);
            }

            // หมดสิทธิ์ re-apply หรือไม่เคยเปิด
            if ($existing->status === 'rejected') {
                return response()->json([
                    'code'    => 'CONTACT_ADMIN',
                    'message' => 'คำขอของคุณถูกปฏิเสธและยังไม่ได้รับสิทธิ์สมัครใหม่ กรุณาติดต่อแอดมิน',
                    'reason'  => $existing->rejected_reason,
                    'actions' => [
                        ['key' => 'CONTACT', 'label' => 'ติดต่อแอดมิน', 'url' => 'mailto:admin@hospital.local'],
                        ['key' => 'CLOSE',   'label' => 'ปิด'],
                    ],
                ], 403);
            }

            if ($existing->status === 'approved') {
                return response()->json([
                    'code'    => 'ALREADY_REGISTERED',
                    'message' => 'เลขบัตรนี้มีบัญชีใช้งานอยู่แล้ว',
                    'actions' => [
                        ['key' => 'LOGIN', 'label' => 'ไปหน้าเข้าสู่ระบบ', 'url' => '/login'],
                        ['key' => 'CLOSE', 'label' => 'ปิด'],
                    ],
                ], 409);
            }

            // pending
            return response()->json([
                'code'    => 'PENDING_EXISTING',
                'message' => 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบหรือท่านใช้เลขบัตรประชาชนซ้ำกับผู้ใช้อื่น',
                'actions' => [
                    ['key' => 'LOGIN', 'label' => 'ไปหน้าเข้าสู่ระบบ', 'url' => '/login'],
                    ['key' => 'CLOSE', 'label' => 'ปิด'],
                ],
            ], 409);
        }

        // 3) สมัครใหม่ปกติ    
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
            ]);

            return response()->json([
                'code'    => 'REGISTERED_PENDING',
                'message' => 'สมัครสำเร็จ ระบบจะตรวจสอบและอนุมัติ โปรดเข้าสู่ระบบภายหลัง',
                'user'    => $user->only(['id','cid','first_name','last_name','email','role','status']),
            ], 201);

        } catch (QueryException $e) {
            if (($e->errorInfo[0] ?? null) === '23000') {
                return response()->json([
                    'code'    => 'ALREADY_REGISTERED',
                    'message' => 'เลขบัตรนี้มีบัญชีใช้งานอยู่แล้ว',
                    'actions' => [
                        ['key' => 'LOGIN', 'label' => 'ไปหน้าเข้าสู่ระบบ', 'url' => '/login'],
                        ['key' => 'CLOSE', 'label' => 'ปิด'],
                    ],
                ], 409);
            }
            Log::error('[REGISTER ERROR:QueryException]', ['e' => $e->getMessage()]);
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการสมัคร กรุณาลองใหม่ภายหลัง'], 500);
        } catch (\Throwable $e) {
            Log::error('[REGISTER ERROR]', ['e' => $e->getMessage()]);
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

            // เคสได้รับสิทธิ์สมัครใหม่แล้ว
            if ($user->status === 'rejected' && $this->isReapplyWindowOpen($user)) {
                $untilIso = $user->reapply_until
                    ? Carbon::parse($user->reapply_until)->toIso8601String()
                    : null;

                return response()->json([
                    'message'       => 'คุณได้รับสิทธิ์ให้สมัครใหม่แล้ว กรุณาสมัครสมาชิกด้วยเลขบัตรเดิม',
                    'code'          => 'ALLOW_REAPPLY',
                    'user_hint'     => 'เตรียมข้อมูลให้ตรงกับบัตรประชาชน และใช้อีเมลที่ติดต่อได้',
                    'reapply_until' => $untilIso,
                    'actions'       => [
                        ['key' => 'REAPPLY', 'label' => 'ไปหน้าสมัครใหม่', 'url' => '/register'],
                        ['key' => 'CLOSE',   'label' => 'ปิด'],
                    ],
                ], 403);
            }

            if ($user->status === 'rejected') {
                return response()->json([
                    'message' => 'บัญชีถูกปฏิเสธการอนุมัติ',
                    'code'    => 'REJECTED',
                    'reason'  => $user->rejected_reason,
                    'actions' => [
                        ['key' => 'CONTACT', 'label' => 'ติดต่อแอดมิน', 'url' => 'mailto:admin@hospital.local'],
                        ['key' => 'CLOSE',   'label' => 'ปิด'],
                    ],
                ], 403);
            }

            // pending
            return response()->json([
                'message' => 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ',
                'code'    => 'PENDING',
                'actions' => [['key' => 'CLOSE', 'label' => 'ปิด']],
            ], 403);
        }

        // ออกโทเคนใหม่ หมดอายุ 24 ชั่วโมง
        $plainToken = $user->issueToken('auth_token', ['*'], now()->addDay());

        Log::info('[LOGIN] User logged in', ['cid' => $user->cid]);

        return response()->json([
            'message'    => 'เข้าสู่ระบบสำเร็จ',
            'user'       => $user->only(['id','cid','first_name','last_name','email','role','status']),
            'token'      => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => now()->addDay()->toISOString(),
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
            'id','cid','first_name','last_name','email','role','status'
        ]));
    }

    /**
     * PUT /api/user
     */
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => ['sometimes','string','max:255'],
            'last_name'  => ['sometimes','string','max:255'],
            'email'      => ['sometimes','nullable','email', Rule::unique('users','email')->ignore($user->id)],
            'password'   => ['nullable','confirmed', Password::min(8)->letters()->numbers()],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if (!empty($data['password'])) {
            $user->password = $data['password']; // mutator hash
        }

        $user->fill(collect($data)->except('password')->toArray());
        $user->save();

        return response()->json([
            'message' => 'แก้ไขข้อมูลผู้ใช้สำเร็จ',
            'user'    => $user->only(['id','cid','first_name','last_name','email','role','status']),
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
        }

        return response()->json(['message' => 'ออกจากระบบแล้ว']);
    }
}
