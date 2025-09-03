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
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Arr;

class AuthController extends Controller
{
    /* =========================================================
     |  Logging helpers (correlation id, timing, redaction)
     * ========================================================= */

    /** ดึง/สร้าง request id (จาก header X-Request-Id ถ้าไม่มีจะสร้าง) */
    protected function requestId(Request $r): string
    {
        $rid = $r->header('X-Request-Id') ?: $r->header('x-request-id');
        return $rid ?: ('rid_' . bin2hex(random_bytes(8)));
    }

    /** เริ่มจับเวลา */
    protected function t0(): float
    {
        return microtime(true);
    }

    /** คำนวณ ms ระหว่าง t0 และตอนนี้ */
    protected function ms(float $t0): float
    {
        return (microtime(true) - $t0) * 1000.0;
    }

    /** meta พื้นฐานของ request */
    protected function meta(Request $r): array
    {
        return [
            'ip'        => $r->ip(),
            'method'    => $r->method(),
            'path'      => $r->path(),
            'ua'        => (string) $r->userAgent(),
            'request_at'=> now(config('app.timezone', 'Asia/Bangkok'))->toIso8601String(),
        ];
    }

    /** ปิดบังข้อมูลอ่อนไหวใน payload */
    protected function redact(array $in): array
    {
        $out = $in;

        $hideKeys = ['password', 'password_confirmation', 'token', 'access_token', 'refresh_token', 'authorization', 'authorization_bearer'];
        foreach ($hideKeys as $k) {
            if (array_key_exists($k, $out)) {
                $out[$k] = '***hidden***';
            }
        }

        // mask cid (โชว์ 3 ตัวแรก + ****** + 4 ตัวท้าย)
        if (isset($out['cid'])) {
            $digits = preg_replace('/\D+/', '', (string) $out['cid']);
            if (strlen($digits) >= 7) {
                $out['cid'] = substr($digits, 0, 3) . '******' . substr($digits, -4);
            } else {
                $out['cid'] = '***';
            }
        }

        return $out;
    }

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
        $rid = $this->requestId($request);
        $t0  = $this->t0();

        // normalize email ให้เรียบร้อยก่อน validate
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $emailRule = $this->looseEmailRule();

        // Log: incoming
        Log::info('[REGISTER] Incoming', [
            'rid'  => $rid,
            'meta' => $this->meta($request),
            'input'=> $this->redact($request->except(['password','password_confirmation'])),
        ]);

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
                'rid'    => $rid,
                'errors' => $validator->errors()->toArray(),
                'ms'     => round($this->ms($t0), 1),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // 2) ตรวจเชิงธุรกิจจาก cid
        if ($existing = User::where('cid', $data['cid'])->first()) {
            Log::notice('[REGISTER] CID exists', [
                'rid'             => $rid,
                'cid'             => $this->redact(['cid' => $data['cid']])['cid'],
                'status'          => $existing->status,
                'reapply_allowed' => $existing->reapply_allowed,
                'reapply_until'   => (string) $existing->reapply_until,
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

                Log::info('[REGISTER] Re-apply updated → pending', [
                    'rid' => $rid,
                    'uid' => $existing->id,
                    'ms'  => round($this->ms($t0), 1),
                ]);

                return response()->json([
                    'code'    => 'REGISTERED_PENDING',
                    'message' => 'สมัครสำเร็จ ระบบจะตรวจสอบและอนุมัติ โปรดเข้าสู่ระบบภายหลัง',
                    'user'    => $existing->only(['id','cid','first_name','last_name','email','role','status']),
                ], 201);
            }

            if ($existing->status === User::STATUS_REJECTED) {
                Log::notice('[REGISTER] Rejected without re-apply', [
                    'rid' => $rid,
                    'uid' => $existing->id,
                    'ms'  => round($this->ms($t0), 1),
                ]);
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
                Log::info('[REGISTER] Already approved account', [
                    'rid' => $rid,
                    'uid' => $existing->id,
                    'ms'  => round($this->ms($t0), 1),
                ]);
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
            Log::info('[REGISTER] Pending existing', [
                'rid' => $rid,
                'uid' => $existing->id,
                'ms'  => round($this->ms($t0), 1),
            ]);
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
                'rid'     => $rid,
                'user_id' => $user->id,
                'ms'      => round($this->ms($t0), 1),
            ]);

            return response()->json([
                'code'    => 'REGISTERED_PENDING',
                'message' => 'สมัครสำเร็จ ระบบจะตรวจสอบและอนุมัติ โปรดเข้าสู่ระบบภายหลัง',
                'user'    => Arr::only($user->toArray(), ['id','cid','first_name','last_name','email','role','status']),
            ], 201);

        } catch (QueryException $e) {
            $sqlState  = $e->errorInfo[0] ?? null; // '23000' = integrity constraint
            $driverMsg = strtolower($e->errorInfo[2] ?? '');

            Log::error('[REGISTER ERROR:QueryException]', [
                'rid'      => $rid,
                'sqlState' => $sqlState,
                'message'  => $e->getMessage(),
                'ms'       => round($this->ms($t0), 1),
            ]);

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

            return response()->json(['message' => 'เกิดข้อผิดพลาดในการสมัคร กรุณาลองใหม่ภายหลัง'], 500);
        } catch (\Throwable $e) {
            Log::error('[REGISTER ERROR]', [
                'rid'     => $rid,
                'message' => $e->getMessage(),
                'ms'      => round($this->ms($t0), 1),
            ]);
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการสมัคร กรุณาลองใหม่ภายหลัง'], 500);
        }
    }

    /**
     * POST /api/login  (Sanctum Session)
     */
    public function login(Request $request)
    {
        $rid = $this->requestId($request);
        $t0  = $this->t0();

        Log::info('[LOGIN] Incoming', [
            'rid'  => $rid,
            'meta' => $this->meta($request),
            'input'=> $this->redact($request->only(['cid'])), // ไม่ log password
        ]);

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
                'rid'    => $rid,
                'errors' => $validator->errors()->toArray(),
                'ms'     => round($this->ms($t0), 1),
            ]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $validator->validated();
            $user = User::where('cid', $data['cid'])->first();

            if (!$user || !Hash::check($data['password'], $user->password)) {
                Log::notice('[LOGIN] Invalid credentials', [
                    'rid' => $rid,
                    'cid' => $this->redact(['cid' => $data['cid']])['cid'],
                    'ms'  => round($this->ms($t0), 1),
                ]);
                return response()->json(['message' => 'เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง'], 401);
            }

            if ($user->status !== User::STATUS_APPROVED) {
                Log::notice('[LOGIN] User not approved', [
                    'rid'    => $rid,
                    'cid'    => $this->redact(['cid' => $user->cid])['cid'],
                    'status' => $user->status,
                ]);

                // เคสได้รับสิทธิ์สมัครใหม่แล้ว
                if ($user->status === User::STATUS_REJECTED && $this->isReapplyWindowOpen($user)) {
                    $untilIso = (User::isEpochDate((string) $user->reapply_until))
                        ? null
                        : Carbon::parse((string) $user->reapply_until)->toIso8601String();

                    Log::info('[LOGIN] Allow re-apply', [
                        'rid'          => $rid,
                        'uid'          => $user->id,
                        'reapply_until'=> $untilIso,
                        'ms'           => round($this->ms($t0), 1),
                    ]);

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
                    Log::info('[LOGIN] Rejected', [
                        'rid'   => $rid,
                        'uid'   => $user->id,
                        'ms'    => round($this->ms($t0), 1),
                    ]);
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
                Log::info('[LOGIN] Pending', [
                    'rid' => $rid,
                    'uid' => $user->id,
                    'ms'  => round($this->ms($t0), 1),
                ]);
                return response()->json([
                    'message' => 'บัญชีกำลังรออนุมัติจากผู้ดูแลระบบ',
                    'code'    => 'PENDING',
                    'actions' => [['key' => 'CLOSE', 'label' => 'ปิด']],
                ], 403);
            }

            // ----- Sanctum Session Login (ไม่มี Bearer) -----
            // ----- Sanctum Session Login (ไม่มี Bearer) -----
            Auth::guard('web')->login($user, true); 
            $request->session()->regenerate();

            Log::info('[LOGIN] User logged in (Sanctum session)', [
                'rid'  => $rid,
                'uid'  => $user->id,
                'cid'  => $this->redact(['cid' => $user->cid])['cid'],
                'ms'   => round($this->ms($t0), 1),
            ]);

            return response()->json([
                'message' => 'เข้าสู่ระบบสำเร็จ',
                'user'    => Arr::only($user->toArray(), ['id','cid','first_name','last_name','email','role','status']),
            ]);


        } catch (\Throwable $e) {
            Log::error('[LOGIN ERROR]', [
                'rid'     => $rid,
                'message' => $e->getMessage(),
                'ms'      => round($this->ms($t0), 1),
            ]);
            return response()->json(['message' => 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่ภายหลัง'], 500);
        }
    }

    /**
     * GET /api/me
     */
    /**
 * GET /api/me  — robust diagnostics
 */
public function me(Request $request)
{
    $rid = $this->requestId($request);
    $t0  = $this->t0();

    try {
        // ==== เก็บข้อมูลวินิจฉัยแบบไม่หลุดข้อมูลอ่อนไหว ====
        $sessionCookieName = (string) config('session.cookie', 'laravel_session');
        $rawSessionCookie  = (string) $request->cookie($sessionCookieName, '');
        $xsrfCookie        = (string) $request->cookie('XSRF-TOKEN', '');

        $hasSessionCookie  = $rawSessionCookie !== '';
        $hasXsrfCookie     = $xsrfCookie !== '';

        // preview เพื่อ log แบบ mask (ไม่ log ค่าจริง)
        $preview = function (?string $v, int $keepHead = 8): ?string {
            if (!$v) return null;
            $v = (string) $v;
            if (strlen($v) <= $keepHead) return str_repeat('*', strlen($v));
            return substr($v, 0, $keepHead) . '...';
        };

        // header ที่เกี่ยวข้อง (ไม่ log cookie ทั้งก้อน)
        $hdr = [
            'origin'   => (string) $request->headers->get('origin', ''),
            'referer'  => (string) $request->headers->get('referer', ''),
            'x_requested_with' => (string) $request->headers->get('x-requested-with', ''),
            // X-XSRF-TOKEN header (จาก axios) — log แบบ mask
            'x_xsrf_token_present' => $request->headers->has('x-xsrf-token'),
            'x_xsrf_token_preview' => $preview($request->headers->get('x-xsrf-token')),
        ];

        // สถานะ session (กัน exception)
        $hasSession = $request->hasSession();
        $sessionStarted = null;
        $sessionIdPreview = null;
        try {
            if ($hasSession) {
                $sessionStarted   = $request->session()->isStarted();
                $sessionIdPreview = $preview($request->session()->getId());
            }
        } catch (\Throwable $se) {
            $sessionStarted   = null;
            $sessionIdPreview = null;
        }

        // ==== พยายาม resolve user ผ่าน guard 'web' (sanctum stateful) ====
       $user = \Illuminate\Support\Facades\Auth::guard('web')->user();

        if (!$user) {
            \Illuminate\Support\Facades\Log::warning('[ME] Unauthenticated', [
                'rid'     => $rid,
                'meta'    => $this->meta($request),
                'cookies' => [
                    'session_cookie_name' => $sessionCookieName,
                    'has_session_cookie'  => $hasSessionCookie,
                    'session_cookie_preview' => $preview($rawSessionCookie),
                    'has_xsrf_cookie'     => $hasXsrfCookie,
                ],
                'headers' => $hdr,
                'session' => [
                    'has_session'     => $hasSession,
                    'started'         => $sessionStarted,
                    'session_id_preview' => $sessionIdPreview,
                ],
                'ms'      => round($this->ms($t0), 1),
            ]);

            return response()->json([
                'message' => 'Unauthenticated.',
                'code'    => 'UNAUTHENTICATED',
            ], 401);
        }

        \Illuminate\Support\Facades\Log::info('[ME] Success', [
            'rid'     => $rid,
            'uid'     => $user->id,
            'session' => [
                'has_session'        => $hasSession,
                'started'            => $sessionStarted,
                'session_id_preview' => $sessionIdPreview,
            ],
            'cookies' => [
                'has_session_cookie' => $hasSessionCookie,
                'has_xsrf_cookie'    => $hasXsrfCookie,
            ],
            'ms'      => round($this->ms($t0), 1),
        ]);

        
    return response()->json(
        Arr::only($user, ['id','cid','first_name','last_name','email','role','status'])
    );

    } catch (\Throwable $e) {
        \Illuminate\Support\Facades\Log::error('[ME ERROR]', [
            'rid'    => $rid,
            'meta'   => $this->meta($request),
            'error'  => $e->getMessage(),
            'file'   => $e->getFile(),
            'line'   => $e->getLine(),
            // แสดง trace เฉพาะตอน APP_DEBUG=true เพื่อลด noise ใน production
            'trace'  => config('app.debug') ? $e->getTraceAsString() : null,
            'ms'     => round($this->ms($t0), 1),
        ]);

        return response()->json([
            'message' => 'เกิดข้อผิดพลาดระหว่างตรวจสอบสถานะผู้ใช้',
            'code'    => 'ME_INTERNAL_ERROR',
        ], 500);
    }
}

    /**
     * POST /api/logout  (Sanctum Session)
     */
    public function logout(Request $request)
    {
        $rid = $this->requestId($request);
        $t0  = $this->t0();

        try {
            if (Auth::check()) {
                $uid = Auth::id();
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                Log::info('[LOGOUT] Session revoked', [
                    'rid' => $rid,
                    'uid' => $uid,
                    'ms'  => round($this->ms($t0), 1),
                ]);
            } else {
                Log::notice('[LOGOUT] No user in request', [
                    'rid'  => $rid,
                    'meta' => $this->meta($request),
                    'ms'   => round($this->ms($t0), 1),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[LOGOUT ERROR]', [
                'rid'     => $rid,
                'message' => $e->getMessage(),
                'ms'      => round($this->ms($t0), 1),
            ]);
            // logout เป็น idempotent ตอบ 200 ได้
        }

        return response()->json(['message' => 'ออกจากระบบแล้ว']);
    }
}
