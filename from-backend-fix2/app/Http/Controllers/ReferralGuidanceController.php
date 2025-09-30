<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ReferralGuidance;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ReferralGuidanceController extends Controller
{
    public function store(Request $request)
    {
        // สร้าง correlation id ให้ทุก log ของคำขอนี้ตามติดกันง่าย
        $cid = (string) Str::uuid();

        Log::info('[Referral][START] รับคำขอ', [
            'cid'      => $cid,
            'ip'       => $request->ip(),
            'ua'       => $request->userAgent(),
            'path'     => $request->path(),
            'method'   => $request->method(),
            // อย่า log body ทั้งก้อนไว้ใน prod — เสี่ยงข้อมูลส่วนบุคคล/ใหญ่เกิน
        ]);

        // 1) Validate
        $validator = Validator::make($request->all(), [
            'question_results'                     => 'required|array|min:1',
            'question_results.*.question'          => 'required|string',
            'question_results.*.question_code'     => 'required|integer',
            'question_results.*.question_title'    => 'required|string',
            'question_results.*.clinic'            => 'required|array|min:1',
            'question_results.*.clinic.*'          => 'string',
            'question_results.*.symptoms'          => 'nullable|array',
            'question_results.*.symptoms.*'        => 'string',
            'question_results.*.note'              => 'nullable|string',
            'question_results.*.is_refer_case'     => 'required|boolean',
            'question_results.*.type'              => 'required|string|in:guide,referral',
            // แนะนำ: ไม่รับ created_at จาก client เพื่อลดจุดพัง format → เอา rule นี้ออก
            // 'question_results.*.created_at'     => 'nullable|date_format:Y-m-d H:i:s',
        ], [
            'question_results.required'            => 'ต้องมีข้อมูลอย่างน้อย 1 รายการ',
            'question_results.*.type.in'           => 'type ต้องเป็น guide หรือ referral เท่านั้น',
            'question_results.*.clinic.required'   => 'ต้องระบุ clinic อย่างน้อย 1 ค่า',
        ]);

        if ($validator->fails()) {
            Log::warning('[Referral][VALIDATION_FAIL]', [
                'cid'    => $cid,
                // log เฉพาะ keys/จำนวน error พอ
                'errors' => $validator->errors()->keys(),
                'count'  => $validator->errors()->count(),
            ]);

            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // 2) Auth
        $user = $request->user();
        if (!$user) {
            Log::warning('[Referral][AUTH_FAIL] user is null', ['cid' => $cid]);
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $userId = $user->id;

        // 3) Mapping
        $now = now();
        $cleanArray = function ($arr) {
            $arr = is_array($arr) ? $arr : [];
            $arr = array_map(fn($v) => is_string($v) ? trim($v) : '', $arr);
            $arr = array_filter($arr, fn($v) => $v !== '');
            return array_values(array_unique($arr));
        };

        $validated = $validator->validated();
        $inputRows = $validated['question_results'];
        Log::info('[Referral][MAPPING] เริ่ม map rows', [
            'cid'        => $cid,
            'rows_count' => is_countable($inputRows) ? count($inputRows) : null,
        ]);

        $rows = collect($inputRows)->map(function ($d) use ($userId, $now, $cleanArray) {
            $clinic   = $cleanArray($d['clinic']   ?? []);
            $symptoms = $cleanArray($d['symptoms'] ?? []);

            return [
                'question'        => $d['question'],
                'question_code'   => (int) $d['question_code'],
                'question_title'  => $d['question_title'],
                'clinic'          => $clinic,              // JSON cast
                'symptoms'        => $symptoms,            // JSON cast
                'note'            => $d['note'] ?? '',
                'is_refer_case'   => (bool) ($d['is_refer_case'] ?? false),
                'type'            => $d['type'],           // 'guide' | 'referral'
                'created_by'      => (int) $userId,
                // ตรึงเวลาที่ server เพื่อลดปัญหา format/timezone
                'created_at'      => $now,
                'updated_at'      => $now,
            ];
        });

        // sample log เฉพาะ 1 แถวแรก (mask ข้อมูลส่วนบุคคลเองถ้ามี)
        $sample = $rows->first();
        unset($sample['note']); // ตัวอย่าง: ไม่ log note ถ้ากังวล PII
        Log::debug('[Referral][MAPPING_DONE] ตัวอย่างแถวแรก', ['cid' => $cid, 'sample' => $sample]);

        // 4) DB Transaction + (optional) SQL listener สำหรับดีบัก
        // (ปิดเมื่อขึ้น prod จริง ถ้ากังวลเรื่อง perf/log noise)
        // DB::listen(fn($q) => Log::debug('[SQL]', ['cid'=>$cid, 'sql'=>$q->sql, 'time_ms'=>$q->time]));

        try {
            DB::transaction(function () use ($rows, $cid) {
                $rows->each(function ($row, $i) use ($cid) {
                    ReferralGuidance::create($row);
                    if ($i < 1) { // log เฉพาะรายการแรกพอ
                        Log::info('[Referral][CREATE_OK] แถวแรกถูกบันทึก', [
                            'cid'  => $cid,
                            'type' => $row['type'] ?? null,
                        ]);
                    }
                });
            });

            Log::info('[Referral][SUCCESS]', [
                'cid'        => $cid,
                'created'    => $rows->count(),
                'created_by' => $userId,
            ]);

            return response()->json([
                'message' => 'บันทึกคำแนะนำสำเร็จ ' . $rows->count() . ' รายการ',
                'errors'  => [],
            ], 201);
        } catch (\Throwable $e) {
            // ดึงข้อมูล error เต็ม ๆ (code/sqlstate/ไฟล์/บรรทัด)
            $errCtx = [
                'cid'   => $cid,
                'msg'   => $e->getMessage(),
                'code'  => method_exists($e, 'getCode') ? $e->getCode() : null,
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                // 'trace' => $e->getTraceAsString(), // เปิดเมื่อจำเป็นจริง ๆ (log จะยาวมาก)
            ];
            Log::error('[Referral][DB_FAIL]', $errCtx);

            // ตัวอย่างตรวจ error FK เพื่อสื่อความชัดเจน (ไม่บังคับ)
            if (str_contains($e->getMessage(), 'Integrity constraint violation')) {
                return response()->json([
                    'error'   => 'ไม่สามารถบันทึกข้อมูลได้ (FK constraint)',
                    'details' => ['ตรวจสอบค่า created_by/user id และความถูกต้องของข้อมูล'],
                    'cid'     => $cid,
                ], 500);
            }

            return response()->json([
                'error'   => 'ไม่สามารถบันทึกข้อมูลได้',
                'details' => [config('app.debug') ? $e->getMessage() : 'Unexpected error'],
                'cid'     => $cid,
            ], 500);
        }
    }

    public function summary(Request $request)
    {
        $cid = (string) Str::uuid();

        $user = $request->user();
        if (!$user) {
            Log::warning('[Referral][SUMMARY][AUTH_FAIL]', ['cid' => $cid]);
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'type'       => 'nullable|in:guide,referral,total',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            Log::warning('[Referral][SUMMARY][VALIDATION_FAIL]', ['cid' => $cid, 'errors' => $validator->errors()->keys()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $type      = $request->query('type') ?: 'total';
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $tz    = config('app.timezone', 'Asia/Bangkok');
        $start = $startDate ? Carbon::parse($startDate, $tz)->startOfDay() : null;
        $end   = $endDate   ? Carbon::parse($endDate, $tz)->endOfDay()   : null;

        try {
            $types = match ($type) {
                'guide'    => ['guide'],
                'referral' => ['referral'],
                default    => ['guide', 'referral'],
            };

            $query = ReferralGuidance::query()
                ->select('question', 'question_code', 'question_title')
                ->selectRaw('COUNT(*) as total')
                ->whereIn('type', $types)
                ->groupBy('question', 'question_code', 'question_title')
                ->orderBy('total', 'desc');

            if ($start) $query->where('created_at', '>=', $start);
            if ($end)   $query->where('created_at', '<=', $end);

            $summary = $query->get();

            Log::info('[Referral][SUMMARY][SUCCESS]', [
                'cid'        => $cid,
                'type'       => $type,
                'rows_count' => $summary->count(),
            ]);

            return response()->json([
                'message' => 'ดึงข้อมูลสรุปสำเร็จ',
                'meta'    => [
                    'type'        => $type,
                    'start_date'  => $startDate,
                    'end_date'    => $endDate,
                    'timezone'    => $tz,
                    'generated_at'=> Carbon::now($tz)->toIso8601String(),
                ],
                'data'    => $summary,
            ], 200);
        } catch (\Throwable $e) {
            Log::error('[Referral][SUMMARY][FAIL]', [
                'cid'  => $cid,
                'msg'  => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'ไม่สามารถดึงข้อมูลสรุปได้',
                'error'   => config('app.debug') ? $e->getMessage() : 'Unexpected error',
                'cid'     => $cid,
            ], 500);
        }
    }
}
