<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ReferralGuidance;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ReferralGuidanceController extends Controller
{
    /**
     * STORE – บันทึกข้อมูลคำแนะนำห้องตรวจ (หลายรายการ)
     * รองรับ type เฉพาะ 'guide' หรือ 'referral'
     */
    public function store(Request $request)
    {
        Log::info('[Referral] เริ่มรับข้อมูล referral_guidances');

        $validator = Validator::make($request->all(), [
            'question_results'                     => 'required|array|min:1',
            'question_results.*.question'          => 'required|string',
            'question_results.*.question_code'     => 'required|integer',
            'question_results.*.question_title'    => 'required|string',
            'question_results.*.clinic'            => 'required|array',
            'question_results.*.clinic.*'          => 'string',
            'question_results.*.symptoms'          => 'nullable|array',
            'question_results.*.symptoms.*'        => 'string',
            'question_results.*.note'              => 'nullable|string',
            'question_results.*.is_refer_case'     => 'required|boolean',
            'question_results.*.type'              => 'required|string|in:guide,referral',
            'question_results.*.created_at'        => 'nullable|date_format:Y-m-d H:i:s',
        ], [
            'question_results.required'            => 'ต้องมีข้อมูลอย่างน้อย 1 รายการ',
            'question_results.*.type.in'           => 'type ต้องเป็น guide หรือ referral เท่านั้น',
            'question_results.*.clinic.required'   => 'ต้องระบุ clinic อย่างน้อย 1 ค่า',
            'question_results.*.created_at.date_format' => 'created_at ต้องอยู่ในรูปแบบ Y-m-d H:i:s',
        ]);

        if ($validator->fails()) {
            Log::warning('[Referral] Validation errors', $validator->errors()->toArray());
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user      = $request->user();
        $createdBy = $user->username ?? $user->name ?? 'unknown';
        $now       = now();

        // เตรียม rows แบบสะอาด (ให้ clinic/symptoms เป็น array แน่ ๆ)
        $rows = collect($validator->validated()['question_results'])->map(function ($d) use ($createdBy, $now) {
            $clinic   = array_values(array_filter($d['clinic']   ?? []));
            $symptoms = array_values(array_filter($d['symptoms'] ?? []));
            return [
                'question'        => $d['question'],
                'question_code'   => $d['question_code'],
                'question_title'  => $d['question_title'],
                'clinic'          => $clinic,                 // Eloquent casts เป็น JSON ให้
                'symptoms'        => $symptoms ?: null,       // ว่าง = null
                'note'            => $d['note'] ?? null,
                'is_refer_case'   => (bool)($d['is_refer_case'] ?? false),
                'type'            => $d['type'],              // 'guide' | 'referral'
                'created_by'      => $createdBy,
                'created_at'      => $d['created_at'] ?? $now,
                'updated_at'      => $now,
            ];
        });

        try {
            DB::transaction(function () use ($rows) {
                // ใช้ create() เพื่อให้ $casts ใน Model ทำงาน (array → json)
                $rows->each(function ($row) {
                    ReferralGuidance::create($row);
                });
            });

            return response()->json([
                'message' => 'บันทึกคำแนะนำสำเร็จ ' . $rows->count() . ' รายการ',
                'errors'  => [],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('[Referral] บันทึกล้มเหลว', ['error' => $e->getMessage()]);
            return response()->json([
                'error'   => 'ไม่สามารถบันทึกข้อมูลได้',
                'details' => [$e->getMessage()],
            ], 500);
        }
    }

    /**
     * SUMMARY – สรุปสถิติคำแนะนำ
     * Query:
     *  - type: (optional) 'guide' | 'referral' | 'total' (default = total)
     *  - start_date: (optional) 'YYYY-MM-DD'
     *  - end_date:   (optional) 'YYYY-MM-DD'
     */
    public function summary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'type'       => 'nullable|in:guide,referral,total',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d',
        ], [
            'type.in'                 => 'type ต้องเป็น guide, referral หรือ total เท่านั้น',
            'start_date.date_format'  => 'start_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
            'end_date.date_format'    => 'end_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $type      = $request->query('type') ?: 'total';
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        // Normalize วันที่ให้ inclusive ตาม timezone
        $tz    = config('app.timezone', 'Asia/Bangkok');
        $start = $startDate ? Carbon::parse($startDate, $tz)->startOfDay() : null;
        $end   = $endDate   ? Carbon::parse($endDate, $tz)->endOfDay()   : null;

        try {
            $types = match ($type) {
                'guide'    => ['guide'],
                'referral' => ['referral'],
                default    => ['guide', 'referral'], // total
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
            Log::error('[Referral] ดึง summary ล้มเหลว', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'ไม่สามารถดึงข้อมูลสรุปได้',
                'error'   => app()->hasDebugModeEnabled() ? $e->getMessage() : 'Unexpected error',
            ], 500);
        }
    }
}
