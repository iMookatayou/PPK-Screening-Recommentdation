<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ReferralGuidance;
use Illuminate\Support\Facades\Log;

class ReferralGuidanceController extends Controller
{
    /**
     * STORE – บันทึกข้อมูลคำแนะนำห้องตรวจ (หลายรายการ)
     */
    public function store(Request $request)
    {
        Log::info('[Referral] เริ่มรับข้อมูล referral_guidances');

        $validated = $request->validate([
            'question_results' => 'required|array|min:1',
            'question_results.*.question'       => 'required|string',
            'question_results.*.question_code'  => 'required|integer',
            'question_results.*.question_title' => 'required|string',
            'question_results.*.clinic'         => 'required|array',
            'question_results.*.symptoms'       => 'nullable|array',
            'question_results.*.note'           => 'nullable|string',
            'question_results.*.is_refer_case'  => 'required|boolean',
            'question_results.*.type'           => 'required|string',
        ]);

        $user = $request->user();
        $createdBy = $user->username ?? $user->name ?? 'unknown';

        $count = 0;
        $errors = [];

        foreach ($validated['question_results'] as $index => $data) {
            try {
                ReferralGuidance::create([
                    'question'        => $data['question'],
                    'question_code'   => $data['question_code'],
                    'question_title'  => $data['question_title'],
                    'clinic'          => $data['clinic'],
                    'symptoms'        => $data['symptoms'] ?? [],
                    'note'            => $data['note'] ?? null,
                    'is_refer_case'   => $data['is_refer_case'],
                    'type'            => $data['type'],
                    'created_by'      => $createdBy,
                ]);
                $count++;
            } catch (\Exception $e) {
                Log::error("[Referral] บันทึกล้มเหลว index: {$index}", [
                    'error' => $e->getMessage(),
                    'data' => $data,
                ]);
                $errors[] = "Index {$index} – " . $e->getMessage();
            }
        }

        if ($count === 0) {
            return response()->json([
                'error' => 'ไม่สามารถบันทึกข้อมูลได้',
                'details' => $errors,
            ], 500);
        }

        return response()->json([
            'message' => "บันทึกคำแนะนำสำเร็จ {$count} รายการ",
            'errors'  => $errors,
        ], 200);
    }

    /**
     * SUMMARY – แสดงข้อมูลสรุปสถิติคำแนะนำห้องตรวจ พร้อมรองรับการกรองช่วงเวลาและ type
     * Query Params:
     *  - type: (optional) 'referral' หรืออื่น ๆ
     *  - start_date: (optional) 'YYYY-MM-DD'
     *  - end_date: (optional) 'YYYY-MM-DD'
     */
    public function summary(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $type = $request->query('type'); // null หรือ 'referral'
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        try {
            $query = ReferralGuidance::select(
                    'question',
                    'question_code',
                    'question_title'
                )
                ->selectRaw('COUNT(*) as total')
                ->groupBy('question', 'question_code', 'question_title')
                ->orderBy('total', 'desc');

            if ($type) {
                $query->where('type', $type);
            }

            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }

            $summary = $query->get();

            return response()->json([
                'message' => 'ดึงข้อมูลสรุปสำเร็จ',
                'data'    => $summary
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Referral] ดึง summary ล้มเหลว', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'ไม่สามารถดึงข้อมูลสรุปได้',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
