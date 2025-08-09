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
     *  - type: formppk|referral (optional; omit = combined)
     *  - start_date: YYYY-MM-DD (optional)
     *  - end_date:   YYYY-MM-DD (optional)
     *
     * Behaviour:
     *  - If only one date is provided, use that same date for both (single-day range).
     *  - If start_date > end_date, they will be swapped for you.
     *  - Date boundaries are handled in SummaryService using startOfDay()/endOfDay() with app timezone.
     */
    public function index(Request $request)
    {
        // 1) Validate query params
        $validator = Validator::make($request->all(), [
            'type'       => 'nullable|in:formppk,referral',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d',
        ], [
            'type.in'            => 'type ต้องเป็น formppk หรือ referral เท่านั้น',
            'start_date.date_format' => 'start_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
            'end_date.date_format'   => 'end_date ต้องอยู่ในรูปแบบ YYYY-MM-DD',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $type      = $request->query('type');        // null|formppk|referral
        $startDate = $request->query('start_date');  // YYYY-MM-DD|null
        $endDate   = $request->query('end_date');    // YYYY-MM-DD|null

        try {
            // 2) If only one date provided, treat as single-day range
            if ($startDate && !$endDate) {
                $endDate = $startDate;
            } elseif ($endDate && !$startDate) {
                $startDate = $endDate;
            }

            // 3) If both provided but reversed, swap them
            if ($startDate && $endDate) {
                $tz = config('app.timezone', 'Asia/Bangkok');
                $start = Carbon::parse($startDate, $tz)->startOfDay();
                $end   = Carbon::parse($endDate, $tz)->endOfDay();

                if ($start->greaterThan($end)) {
                    // swap
                    [$startDate, $endDate] = [$end->toDateString(), $start->toDateString()];
                } else {
                    // normalize back to date-only strings (service will expand to full-day again)
                    $startDate = $start->toDateString();
                    $endDate   = $end->toDateString();
                }
            }

            // 4) Fetch summary via service (single source of truth)
            if ($type) {
                $summary = $this->summaryService->getSummary($type, $startDate, $endDate);
            } else {
                $summary = $this->summaryService->getCombinedSummary($startDate, $endDate);
            }

            // 5) Build response
            $response = [
                'message' => 'Summary fetched successfully',
                'meta'    => [
                    'type'        => $type ?? 'combined',
                    'start_date'  => $startDate,
                    'end_date'    => $endDate,
                    'timezone'    => config('app.timezone', 'Asia/Bangkok'),
                    'generated_at'=> Carbon::now(config('app.timezone', 'Asia/Bangkok'))->toIso8601String(),
                ],
                'data'    => is_array($summary) ? $summary : $summary->toArray(),
            ];

            return response()->json($response, 200);

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
