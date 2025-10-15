<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class EnsureTablesExist
{
    public function handle(Request $request, Closure $next, ...$unused)
    {
        $segment = (string) ($request->segment(2) ?? '');
        $required = $this->tablesFor($segment);

        array_unshift($required, 'migrations');

        $required = array_values(array_unique($required));

        $useCache = ! $request->boolean('no_cache');
        $ttl = (int) config('dbready.cache_seconds', 10);
        $key = 'dbready:' . $segment . ':' . implode(',', $required);

        $check = function () use ($required) {
            $missing = [];
            foreach ($required as $name) {
                if (str_contains($name, '|')) {
                    $alts = array_filter(array_map('trim', explode('|', $name)));
                    $ok = false;
                    foreach ($alts as $alt) {
                        if (Schema::hasTable($alt)) {
                            $ok = true;
                            break;
                        }
                    }
                    if (! $ok) {
                        $missing[] = $name; 
                    }
                } else {
                    if (! Schema::hasTable($name)) {
                        $missing[] = $name;
                    }
                }
            }
            return $missing; 
        };

        $missing = $useCache ? Cache::remember($key, $ttl, $check) : $check();

        if (! empty($missing)) {
            Log::warning('ฐานข้อมูลยังไม่พร้อม (ตารางสำคัญหายไป)', [
                'database' => DB::connection()->getDatabaseName(),
                'path'     => $request->path(),
                'segment'  => $segment,
                'required' => $required,
                'missing'  => $missing,
                'ip'       => $request->ip(),
            ]);

            return response()->json([
                'ok'         => false,
                'message'    => 'ฐานข้อมูลยังไม่พร้อมใช้งาน (ตารางสำคัญหายไป)',
                'error_code' => 'DB_NOT_READY',
                'database'   => DB::connection()->getDatabaseName(),
                'missing'    => $missing,
            ], 503);
        }

        return $next($request);
    }

    private function tablesFor(string $segment): array
    {
        return match ($segment) {
            //Auth / Profile
            'me', 'user', 'logout-token' => [
                'users', 'personal_access_tokens',
            ],

            //Referral Guidances 
            'referral-guidances' => [
                'users', 'personal_access_tokens',
                'referral_guidances',
                'question_result|question_results',
            ],

            //Form PPK / Patients
            'form-ppk', 'patients' => [
                'users', 'personal_access_tokens',
                'patient_cases',
                'question_result|question_results',
            ],

            //Diseases
            'diseases' => [
                'users', 'personal_access_tokens',
                'diseases',
            ],

            //Summary
            'summary' => [
                'users', 'personal_access_tokens',
                'patient_cases',
                'referral_guidances',
                'question_result|question_results',
            ],

            //Admin
            'admin' => [
                'users', 'personal_access_tokens',
            ],

            //ค่าเริ่มต้นสำหรับเส้นทางอื่น ๆ
            default => [
                'users', 'personal_access_tokens',
            ],
        };
    }
}
