<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Services\SummaryService;
use Carbon\Carbon;

class SummaryController extends Controller
{
    protected SummaryService $summaryService;

    public function __construct(SummaryService $summaryService)
    {
        $this->summaryService = $summaryService;
    }

    /**
     * GET /api/summary
     * รองรับ: ?type=form|guide|total|formppk
     * วัน: start_date/end_date หรือ from/to หรือ date (วันเดียว)
     */
    public function index(Request $request)
    {
        // (1) Validate
        $validator = Validator::make($request->all(), [
            'type'       => 'nullable|in:form,guide,total,formppk',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d',
            'from'       => 'nullable|date_format:Y-m-d',
            'to'         => 'nullable|date_format:Y-m-d',
            'date'       => 'nullable|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // (2) Normalize type
        $type = $request->query('type') ?: 'total';
        if ($type === 'formppk') $type = 'form';

        // (3) Normalize dates (from/to | start_date/end_date | date)
        $startDate = $request->query('start_date') ?? $request->query('from');
        $endDate   = $request->query('end_date')   ?? $request->query('to');
        $oneDate   = $request->query('date');

        $tz = config('app.timezone', 'Asia/Bangkok');

        try {
            // วันเดียว → ใช้เป็นทั้ง start/end
            if (!$startDate && !$endDate && $oneDate) {
                $startDate = $oneDate;
                $endDate   = $oneDate;
            }
            // กรอกมาไม่ครบ → เติมให้ครบ
            if ($startDate && !$endDate) $endDate = $startDate;
            if ($endDate && !$startDate) $startDate = $endDate;

            // จัดช่วงวันให้เรียบร้อย
            if ($startDate && $endDate) {
                $start = Carbon::parse($startDate, $tz)->startOfDay();
                $end   = Carbon::parse($endDate, $tz)->endOfDay();
                if ($start->greaterThan($end)) {
                    [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
                }
                // ส่งเป็น string YYYY-MM-DD (ส่วน logic endOfDay ให้ serviceจัดการเองตามต้องการ)
                $startDate = $start->toDateString();
                $endDate   = $end->toDateString();
            } else {
                $startDate = null;
                $endDate   = null;
            }

            // (4) เรียก service
            $summary = $this->summaryService->getSummary($type, $startDate, $endDate);

            // (5) ทำให้เป็น array เสมอ (รองรับ Arrayable/JsonSerializable)
            if (is_object($summary) && method_exists($summary, 'toArray')) {
                $summary = $summary->toArray();
            } elseif ($summary instanceof \JsonSerializable) {
                $summary = $summary->jsonSerialize();
            } elseif (!is_array($summary)) {
                $summary = (array) $summary;
            }

            return response()->json([
                'message' => 'Summary fetched successfully',
                'meta'    => [
                    'type'         => $type,
                    'start_date'   => $startDate,
                    'end_date'     => $endDate,
                    'timezone'     => $tz,
                    'generated_at' => Carbon::now($tz)->toIso8601String(),
                ],
                'data' => $summary,
            ], 200);

        } catch (\Throwable $e) {
            Log::error('[SummaryController] index failed', [
                'type'       => $type,
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'error'      => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch summary',
                'error'   => config('app.debug') ? $e->getMessage() : 'Unexpected error',
            ], 500);
        }
    }
}
