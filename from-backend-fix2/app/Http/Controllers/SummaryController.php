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
     * Query params:
     *  - type: form|guide|total (optional; omit = total)  // รองรับ alias formppk ด้วย
     *  - start_date: YYYY-MM-DD (optional)
     *  - end_date:   YYYY-MM-DD (optional)
     */
    public function index(Request $request)
    {
        // 1) Validate query params (ยอมรับ formppk เพื่อ backward compat)
        $validator = Validator::make($request->all(), [
            'type'       => 'nullable|in:form,guide,total,formppk',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d',
        ], [
            'type.in'                 => 'type ต้องเป็น form, guide, total หรือ formppk เท่านั้น',
            'start_date.date_format'  => 'start_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
            'end_date.date_format'    => 'end_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // 2) Normalize params
        $type      = $request->query('type') ?: 'total'; // default รวมยอดเดียว
        if ($type === 'formppk') {
            $type = 'form';
        }

        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        try {
            // 3) Single-day and swap handling
            if ($startDate && !$endDate) {
                $endDate = $startDate;
            } elseif ($endDate && !$startDate) {
                $startDate = $endDate;
            }

            if ($startDate && $endDate) {
                $tz = config('app.timezone', 'Asia/Bangkok');
                $start = Carbon::parse($startDate, $tz)->startOfDay();
                $end   = Carbon::parse($endDate, $tz)->endOfDay();

                if ($start->greaterThan($end)) {
                    [$startDate, $endDate] = [$end->toDateString(), $start->toDateString()];
                } else {
                    $startDate = $start->toDateString();
                    $endDate   = $end->toDateString();
                }
            }

            // 4) Fetch summary via service
            $summary = $this->summaryService->getSummary($type, $startDate, $endDate);

            // 5) Response
            return response()->json([
                'message' => 'Summary fetched successfully',
                'meta'    => [
                    'type'        => $type,
                    'start_date'  => $startDate,
                    'end_date'    => $endDate,
                    'timezone'    => config('app.timezone', 'Asia/Bangkok'),
                    'generated_at'=> Carbon::now(config('app.timezone', 'Asia/Bangkok'))->toIso8601String(),
                ],
                'data'    => $summary->toArray(),
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
                'error'   => app()->hasDebugModeEnabled() ? $e->getMessage() : 'Unexpected error',
            ], 500);
        }
    }
}
