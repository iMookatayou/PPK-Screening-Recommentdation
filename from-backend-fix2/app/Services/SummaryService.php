<?php

namespace App\Services;

use App\Models\QuestionResult;
use App\Models\ReferralGuidance;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class SummaryService
{
    /**
     * คืนค่า [$start, $end] แบบ inclusive ทั้งวัน และผูกกับ timezone ระบบ (Asia/Bangkok)
     */
    protected function normalizeDateRange(?string $startDate, ?string $endDate): array
    {
        $tz = config('app.timezone', 'Asia/Bangkok');

        $start = $startDate
            ? Carbon::parse($startDate, $tz)->startOfDay()
            : null;

        $end = $endDate
            ? Carbon::parse($endDate, $tz)->endOfDay()
            : null;

        return [$start, $end];
    }

    /**
     * Summary แยกตาม type:
     * - formppk: นับอาการ (symptoms) จาก QuestionResult.type='formppk'
     * - referral: นับราย question จาก ReferralGuidance
     */
    public function getSummary(?string $type = null, ?string $startDate = null, ?string $endDate = null): Collection
    {
        [$start, $end] = $this->normalizeDateRange($startDate, $endDate);

        // ถ้ามีช่วงเวลา -> ไม่ cache เพื่อความถูกต้อง
        if ($start || $end) {
            return $this->buildSummary($type, $start, $end);
        }

        // ไม่มีช่วงเวลา -> cache 10 นาที
        $cacheKey = $type ? "summary_{$type}" : 'summary_all';
        return Cache::remember($cacheKey, 600, function () use ($type) {
            return $this->buildSummary($type, null, null);
        });
    }

    /**
     * รวม formppk + referral
     * โครงสร้าง: ['formppk' => Collection, 'referral' => Collection]
     */
    public function getCombinedSummary(?string $startDate = null, ?string $endDate = null): array
    {
        [$start, $end] = $this->normalizeDateRange($startDate, $endDate);

        // ถ้ามีช่วงเวลา -> ไม่ cache
        if ($start || $end) {
            return [
                'formppk' => $this->buildSummary('formppk', $start, $end),
                'referral' => $this->buildSummary('referral', $start, $end),
            ];
        }

        // ไม่มีช่วงเวลา -> cache 10 นาที
        return Cache::remember('summary_combined', 600, function () {
            return [
                'formppk' => $this->buildSummary('formppk', null, null),
                'referral' => $this->buildSummary('referral', null, null),
            ];
        });
    }

    /**
     * ฟังก์ชันแกนกลางสำหรับประกอบสรุป
     */
    protected function buildSummary(?string $type, $start, $end): Collection
    {
        if ($type === 'formppk') {
            // นับ symptoms จาก QuestionResult.type=formppk
            $query = QuestionResult::query()->where('type', 'formppk');
            if ($start) $query->where('created_at', '>=', $start);
            if ($end)   $query->where('created_at', '<=', $end);

            $rows = $query->get(['symptoms']);

            return $rows
                ->flatMap(fn ($r) => is_array($r->symptoms) ? $r->symptoms : [])
                ->filter()
                ->countBy()
                ->map(fn ($total, $symptom) => [
                    'symptom' => $symptom,
                    'total'   => $total,
                ])
                ->values();
        }

        if ($type === 'referral') {
            // นับราย question ใน ReferralGuidance
            $query = ReferralGuidance::query()
                ->select('question', 'question_code', 'question_title')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('question', 'question_code', 'question_title')
                ->orderBy('total', 'desc');

            if ($start) $query->where('created_at', '>=', $start);
            if ($end)   $query->where('created_at', '<=', $end);

            return $query->get();
        }

        // type = null (all) -> รวม 2 แบบ แล้ว merge ใส่ key คนละรูปแบบ
        return collect([
            'formppk'  => $this->buildSummary('formppk', $start, $end),
            'referral' => $this->buildSummary('referral', $start, $end),
        ]);
    }
}
