<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class EnsureTablesExist
{
    public function handle(Request $request, Closure $next, ...$tables)
    {
        // ถ้าไม่ส่งพารามิเตอร์มา ให้ใช้ค่า default จาก config
        if (empty($tables)) {
            $tables = config('dbready.required_tables', []);
        }

        // กันกรณียังไม่ได้ migrate อะไรเลย
        array_unshift($tables, 'migrations');
        $tables = array_values(array_unique($tables));

        // cache เพื่อลดรอบการเช็ค
        $key = 'dbready:' . implode(',', $tables);
        $ready = Cache::remember($key, config('dbready.cache_seconds', 10), function () use ($tables) {
            foreach ($tables as $t) {
                if (! Schema::hasTable($t)) {
                    return false;
                }
            }
            return true;
        });

        if (! $ready) {
            // ---- LOG ----
            Log::warning('Database not ready: missing required tables', [
                'required' => $tables,
                'url'      => request()->fullUrl(),
                'ip'       => request()->ip(),
            ]);

            return response()->json([
                'ok'         => false,
                'message'    => 'ฐานข้อมูลยังไม่พร้อมใช้งาน',
                'error_code' => 'DB_NOT_READY',
            ], 503);
        }

        return $next($request);
    }
}
