<?php

namespace App\Services;

use App\Models\QuestionResult;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class SummaryService
{
    protected function normalizeDateRange(?string $startDate, ?string $endDate): array
    {
        $tz = config('app.timezone', 'Asia/Bangkok');

        $start = $startDate ? Carbon::parse($startDate, $tz)->startOfDay() : null;
        $end   = $endDate   ? Carbon::parse($endDate, $tz)->endOfDay()   : null;

        return [$start, $end];
    }

    public function getSummary(string $type = 'total', ?string $startDate = null, ?string $endDate = null): Collection
    {
        if ($type === 'formppk') $type = 'form';

        [$start, $end] = $this->normalizeDateRange($startDate, $endDate);

        if ($start || $end) {
            return $this->buildSummary($type, $start, $end);
        }

        return Cache::remember("summary_{$type}", 600, function () use ($type) {
            return $this->buildSummary($type, null, null);
        });
    }

    public function getCombinedSummary(?string $startDate = null, ?string $endDate = null): array
    {
        [$start, $end] = $this->normalizeDateRange($startDate, $endDate);

        if ($start || $end) {
            return [
                'form'  => $this->buildSummary('form',  $start, $end),
                'guide' => $this->buildSummary('guide', $start, $end),
                'total' => $this->buildSummary('total', $start, $end),
            ];
        }

        return Cache::remember('summary_combined', 600, function () {
            return [
                'form'  => $this->buildSummary('form',  null, null),
                'guide' => $this->buildSummary('guide', null, null),
                'total' => $this->buildSummary('total', null, null),
            ];
        });
    }

    /**
     * - กรอง symptom ที่เป็นโน้ต (_note/note) ทิ้ง
     * - ถ้า symptoms เป็น slug อังกฤษล้วน และมี question_title → ใช้ question_title
     * - ถ้า symptoms ว่าง → ใช้ question_title -> question_key -> question (ตัด *_note ออกด้วย)
     * - รวมซ้ำแบบ case-insensitive
     */
    protected function buildSummary(string $type, $start, $end): \Illuminate\Support\Collection
    {
        if ($type === 'formppk') $type = 'form';

        $types = match ($type) {
            'form'  => ['form', 'formppk'],
            'guide' => ['guide'],
            default => ['form', 'formppk', 'guide'],
        };

        $query = QuestionResult::query()->whereIn('type', $types);
        if ($start) $query->where('created_at', '>=', $start);
        if ($end)   $query->where('created_at', '<=', $end);

        // ต้องดึง field ที่ใช้ fallback มาด้วย
        $rows = $query->get(['symptoms', 'question_title', 'question_key', 'question']);

        $labels = $rows->flatMap(function ($r) {
            // 0) fallback label ที่อ่านรู้เรื่องที่สุด (และไม่ใช่ *_note)
            $fallback = $this->pickCleanLabel([
                $r->question_title ?? null,
                $r->question_key   ?? null,
                $r->question       ?? null,
            ]);

            $list = [];

            // 1) ใช้ symptoms ถ้ามี และ "กรองโน้ต" ออก
            if (is_array($r->symptoms) && !empty($r->symptoms)) {
                $list = array_values(array_filter(array_map(function ($s) {
                    $t = trim((string)$s);
                    if ($t === '') return null;

                    // กรองโน้ต: ลงท้าย _note หรือคำว่า note
                    if (preg_match('/(^|_)note$/i', $t) || strtolower($t) === 'note') return null;

                    // normalize ช่องว่าง
                    $t = preg_replace('/\s+/u', ' ', $t);

                    return $t;
                }, $r->symptoms)));
            }

            // 2) ถ้า symptom ทั้งหมดเป็น "slug" อังกฤษล้วน และมี fallback → ใช้ fallback เพียงตัวเดียว
            if (!empty($list)) {
                $allSlug = collect($list)->every(function ($t) {
                    $t = str_replace('_', ' ', $t);
                    return preg_match('/^[A-Za-z0-9 ]+$/', $t) === 1;
                });

                if ($allSlug && $fallback) {
                    $list = [$fallback];
                }
            }

            // 3) ถ้าไม่มีอะไรเลย → ใช้ fallback
            if (empty($list) && $fallback) {
                $list = [$fallback];
            }

            // 4) คืนรายการที่ clean แล้ว
            return collect($list)
                ->map(fn ($t) => preg_replace('/\s+/u', ' ', trim((string)$t)))
                ->filter();
        });

        // 5) รวมซ้ำแบบ case-insensitive แต่เก็บ label ต้นฉบับไว้แสดง
        $counts = collect();
        foreach ($labels as $label) {
            $key = mb_strtolower($label, 'UTF-8');
            $counts[$key] = [
                'symptom' => $label,
                'total'   => ($counts[$key]['total'] ?? 0) + 1,
            ];
        }

        return $counts->values();
    }

    /**
     * เลือกข้อความแรกที่ไม่ว่าง และไม่ใช่ *_note / note
     */
    protected function pickCleanLabel(array $candidates): ?string
    {
        foreach ($candidates as $v) {
            if (!is_string($v)) continue;
            $t = trim($v);
            if ($t === '') continue;

            // กรองโน้ตทุกแบบ
            if (preg_match('/(^|_)note$/i', $t)) continue;

            return $t;
        }
        return null;
    }
}
