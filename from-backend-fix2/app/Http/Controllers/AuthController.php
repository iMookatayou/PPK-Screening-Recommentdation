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
    /** กฎอีเมลแบบหลวม: แค่มี @ และมีตัวอักษรก่อน-หลัง @ ก็พอ (ไม่ต้องมี .com) */
    protected function looseEmailRule(): string
    {
        // ตัวอย่างที่ยอมรับ: user@example, a@b, u@wfh
        // ไม่ยอมรับ: @domain, user@, มีช่องว่าง
        return 'regex:/^[^@\s]+@[^@\s]+$/';
    }

    /** helper: ยังอยู่ในช่วงเปิดสิทธิ์สมัครใหม่หรือไม่ (รองรับ sentinel '1970-01-01') */
    protected function isReapplyWindowOpen(User $u): bool
    {
        if (!$u->reapply_allowed) return false;

        // sentinel = ไม่มีวันหมดเขต
        $until = $u->reapply_until ? (string) $u->reapply_until : User::EPOCH_DATE;
        if (User::isEpochDate($until)) return true;

        $tz = config('app.timezone', 'Asia/Bangkok');
        return Carbon::now($tz)->startOfDay()->lte(Carbon::parse($until, $tz)->endOfDay());
    }

    /**
     * POST /api/register
     */
    public function register(Request $request)
    {
        // normalize email ให้เรียบร้อยก่อน validate
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $emailRule = $this->looseEmailRule();

        // 1) Validate (ไม่ใส่ unique:cid เพื่อควบคุมข้อความเอง; email ต้อง required)
        $validator = Validator::make($request->all(), [
            'cid'        => ['required', 'digits:13', 'regex:/^\d{13}$/'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'max:255', $emailRule, Rule::unique('users', 'email')],
            'password'   => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], [
            'cid.required'        => 'กรุณากรอกเลขบัตรประชาชน',
            'cid.digits'          => 'เลขบัตรประชาชนต้องมี 13 หลัก',
            'cid.regex'           => 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',
            'first_name.required' => 'กรุณากรอกชื่อ',
            'last_name.required'  => 'กรุณากรอกนามสกุล',
            'email.required'      => 'กรุณากรอกอีเมล',
            // เปลี่ยนข้อความเป็นรูปแบบที่เรายอมรับ
            'email.regex'         => 'กรุณากรอกอีเมลในรูปแบบ name@domain (ไม่ต้องมี .com ก็ได้)',
            'email.unique'        => 'อีเมลนี้ถูกใช้แล้ว',
            'password.required'   => 'กรุณากรอกรหัสผ่าน',
            'password.confirmed'  => 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
            'password.min'        => 'รหัสผ่านอย่างน้อย 8 ตัวอักษร',
        ]);

        if ($validator->fails()) {
            Log::warning('[REGISTER] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => collect($request->all())->except(['password', 'password_confirmation'])->toArray(),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // 2) ตรวจเชิงธุรกิจจาก cid
        if ($existing = User::where('cid', $data['cid'])->first()) {
            Log::notice('[REGISTER] CID exists', [
                'cid'              => $data['cid'],
                'status'           => $existing->status,
                'reapply_allowed'  => $existing->reapply_allowed,
                'reapply_until'    => (string) $existing->reapply_until,
            ]);

            // เคส re-apply: อนุญาตให้ “สมัครใหม่” ซ้ำบน record เดิม
            if ($existing->status === User::STATUS_REJECTED && $this->isReapplyWindowOpen($existing)) {
                $existing->forceFill([
                    'first_name'      => $data['first_name'],
                    'last_name'       => $data['last_name'],
                    'email'           => $data['email'],   // required
                    'password'        => $data['password'], // mutator จะ hash ให้
                    'status'          => User::STATUS_PENDING,
                    'approved_at'     => null,              // model จะ map เป็น sentinel
                    'rejected_reason' => null,              // ''
                    'reapply_allowed' => false,
                    'reapply_until'   => null,              // '1970-01-01'
                ])->save();

                return response()->json([
                    'code'    => 'REGISTERED_PENDING',
                    'message' => 'สมัครสำเร็จ ระบบจะตรวจสอบและอนุมัติ โปรดเข้าสู่ระบบภายหลัง',
                    'user'    => $existing->only(['id','cid','first_name','last_name','email','role','status']),
                ], 201);
            }

            if ($existing->status === User::STATUS_REJECTED) {
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

            if ($existing->status === User::STATUS_APPROVED) {
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
                'email'      => $data['email'],      // required
                'password'   => $data['password'],   // mutator hash
                'role'       => User::ROLE_USER,
                'status'     => User::STATUS_PENDING,
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
            $sqlState  = $e->errorInfo[0] ?? null; // '23000' = integrity constraint
            $driverMsg = strtolower($e->errorInfo[2] ?? '');

            if ($sqlState === '23000') {
                if (strpos($driverMsg, 'users_email_unique') !== false || strpos($driverMsg, 'email') !== false) {
                    return response()->json([
                        'code'    => 'EMAIL_IN_USE',
                        'message' => 'อีเมลนี้ถูกใช้แล้ว',
                    ], 409);
                }
                if (strpos($driverMsg, 'users_cid_unique') !== false || strpos($driverMsg, 'cid') !== false) {
                    return response()->json([
                        'code'    => 'ALREADY_REGISTERED',
                        'message' => 'เลขบัตรนี้มีบัญชีใช้งานอยู่แล้ว',
                        'actions' => [
                            ['key' => 'LOGIN', 'label' => 'ไปหน้าเข้าสู่ระบบ', 'url' => '/login'],
                            ['key' => 'CLOSE', 'label' => 'ปิด'],
                        ],
                    ], 409);
                }
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
            'cid'      => ['required', 'digits:13', 'regex:/^\d{13}$/'],
            'password' => ['required', 'string'],
        ], [
            'cid.required'       => 'กรุณากรอกเลขบัตรประชาชน',
            'cid.digits'         => 'เลขบัตรประชาชนต้องมี 13 หลัก',
            'cid.regex'          => 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',
            'password.required'  => 'กรุณากรอกรหัสผ่าน',
        ]);

        if ($validator->fails()) {
            Log::warning('[LOGIN] Validation failed', [
                'errors' => $validator->errors()->toArray(),
                'cid'    => $request->input('cid'),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $user = User::where('cid', $data['cid'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            Log::notice('[LOGIN] Invalid credentials', ['cid' => $data['cid']]);
            return response()->json(['message' => 'เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง'], 401);
        }

        if ($user->status !== User::STATUS_APPROVED) {
            Log::notice('[LOGIN] User not approved', [
                'cid'    => $user->cid,
                'status' => $user->status,
            ]);

            // เคสได้รับสิทธิ์สมัครใหม่แล้ว
            if ($user->status === User::STATUS_REJECTED && $this->isReapplyWindowOpen($user)) {
                $untilIso = (User::isEpochDate((string) $user->reapply_until))
                    ? null
                    : Carbon::parse((string) $user->reapply_until)->toIso8601String();

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

            if ($user->status === User::STATUS_REJECTED) {
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
        $expires    = now(config('app.timezone', 'Asia/Bangkok'))->addDay();
        $plainToken = $user->issueToken('auth_token', ['*'], $expires);

        Log::info('[LOGIN] User logged in', ['cid' => $user->cid]);

        return response()->json([
            'message'    => 'เข้าสู่ระบบสำเร็จ',
            'user'       => $user->only(['id','cid','first_name','last_name','email','role','status']),
            'token'      => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => $expires->toIso8601String(),
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

        // normalize email ก่อน validate (ถ้ามีส่งมา)
        if ($request->has('email')) {
            $request->merge([
                'email' => mb_strtolower(trim((string) $request->input('email'))),
            ]);
        }

        $emailRule = $this->looseEmailRule();

        $validator = Validator::make($request->all(), [
            'first_name' => ['sometimes','string','max:255','filled'],
            'last_name'  => ['sometimes','string','max:255','filled'],
            'email'      => ['sometimes','string','max:255','filled', $emailRule, Rule::unique('users','email')->ignore($user->id)],
            'password'   => ['nullable','confirmed', Password::min(8)->letters()->numbers()],
        ], [
            'email.regex' => 'กรุณากรอกอีเมลในรูปแบบ name@domain (ไม่ต้องมี .com ก็ได้)',
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
