<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Throwable;
use App\Models\PatientCase;
use App\Models\QuestionResult;
use App\Services\SummaryService;
use Carbon\Carbon;
use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;
class FormPPKController extends Controller
{
    /* ---------------------------- Utilities ---------------------------- */

    /**
     * @param  string      $code
     * @param  string      $message
     * @param  array|null  $data
     * @param  array|null  $errors
     * @param  int         $httpStatus
     * @param  array|null  $debug
     */
    protected function respondApi(
        string $code,
        string $message,
        array $data = null,
        array $errors = null,
        int $httpStatus = 200,
        array $debug = null
    ): JsonResponse {
        $payload = [
            'code'    => $code,
            'message' => $message,
        ];
        if (!is_null($data))   $payload['data']   = $data;
        if (!is_null($errors)) $payload['errors'] = $errors;

        if (config('app.debug') && !empty($debug)) {
            $payload['debug'] = $debug;
        }

        return response()->json($payload, $httpStatus);
    }

    /**
     * แปลง QueryException เป็น status code ที่เหมาะสม
     * - 23000/1062 (MySQL duplicate key) -> 409 Conflict
     */
    protected function mapQueryExceptionStatus(QueryException $e): int
    {
        $sqlState   = $e->getCode();              // e.g. 23000
        $driverCode = $e->errorInfo[1] ?? null;   // e.g. 1062

        if ($sqlState === '23000' || $driverCode === 1062) {
            return 409; // duplicate / constraint violation
        }
        return 500;
    }

    /* ----------------------------- Endpoints ----------------------------- */

    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 20);

        $p = PatientCase::query()
            ->latest('created_at')
            ->select(['id','case_id','cid','name','age','gender','created_at','summary_clinics'])
            ->paginate($perPage);

        return $this->respondApi('CASE_LIST', 'ดึงรายการเคสสำเร็จ', [
            'items' => $p->items(),
            'meta'  => [
                'current_page' => $p->currentPage(),
                'per_page'     => $p->perPage(),
                'total'        => $p->total(),
                'last_page'    => $p->lastPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        Log::info('[FormPPK] เริ่มรับข้อมูล form-ppk', $request->all());

        $validator = Validator::make($request->all(), [
            'case_id'             => 'required|string|unique:patient_cases,case_id',
            'cid'                 => 'required|string',
            'name'                => 'required|string',
            'age'                 => 'required|integer',
            'gender'              => 'required|string',

            'maininscl_name'      => 'nullable|string',
            'hmain_name'          => 'nullable|string',

            'summary_clinics'     => 'required|array',
            'summary_clinics.*'   => 'string',
            'symptoms'            => 'nullable|array',
            'symptoms.*'          => 'string',

            'question_results'                        => 'required|array|min:1',
            'question_results.*.question'             => 'required|string',
            'question_results.*.question_key'         => 'required|string',
            'question_results.*.question_code'        => 'required|integer',
            'question_results.*.question_title'       => 'required|string',
            'question_results.*.clinic'               => 'required|array',
            'question_results.*.clinic.*'             => 'string',
            'question_results.*.symptoms'             => 'nullable|array',
            'question_results.*.symptoms.*'           => 'string',
            'question_results.*.note'                 => 'nullable|string',
            'question_results.*.is_refer_case'        => 'required|boolean',
            'question_results.*.type'                 => 'required|string|in:form,guide,referral,kiosk',
            'question_results.*.created_by'           => 'nullable|integer|exists:users,id',
            'question_results.*.created_at'           => 'nullable|date_format:Y-m-d H:i:s',
        ]);

        if ($validator->fails()) {
            return $this->respondApi('VALIDATION_FAILED', 'ข้อมูลไม่ถูกต้อง', null, $validator->errors()->toArray(), 422);
        }

        $validated = $validator->validated();

        // สิทธิการรักษา: ถ้าไม่ได้ส่ง/ว่าง → ตั้งข้อความมาตรฐาน
        $validated['maininscl_name'] = trim((string)($validated['maininscl_name'] ?? '')) ?: 'ไม่มีการบันทึกสิทธิการรักษา';
        $validated['hmain_name']     = trim((string)($validated['hmain_name'] ?? '')) ?: 'ไม่มีการบันทึกสิทธิการรักษา';

        try {
            return DB::transaction(function () use ($request, $validated) {
                // 1) ดึงผู้ใช้ปัจจุบัน → ใช้ id เป็น created_by
                $user = $request->user();
                $createdBy = $user?->id ?? null;

                // 2) patient_cases
                $patient = PatientCase::create([
                    'case_id'         => $validated['case_id'],
                    'cid'             => $validated['cid'],
                    'name'            => $validated['name'],
                    'age'             => $validated['age'],
                    'gender'          => $validated['gender'],
                    'maininscl_name'  => $validated['maininscl_name'],
                    'hmain_name'      => $validated['hmain_name'],
                    'summary_clinics' => $this->cleanStringArray($validated['summary_clinics'] ?? []),
                    'symptoms'        => $this->cleanStringArray($validated['symptoms'] ?? []),

                    'created_by'      => $createdBy,
                ]);

                // 3) question_results
                $now  = now();
                $rows = collect($validated['question_results'])->map(function ($q) use ($validated, $createdBy, $now, $patient) {
                    $clinic   = $this->cleanStringArray($q['clinic'] ?? []);
                    $symptoms = $this->normalizeSymptoms(
                        $q['symptoms'] ?? [],
                        $q['question_title'] ?? null,
                        $q['question_key'] ?? null,
                        $q['question'] ?? null
                    );

                    return [
                        'patient_case_id' => $patient->id,
                        'case_id'         => $validated['case_id'],
                        'question'        => $q['question'],
                        'question_key'    => $q['question_key'],
                        'question_code'   => $q['question_code'],
                        'question_title'  => $q['question_title'],
                        'clinic'          => $clinic,
                        'symptoms'        => $symptoms,
                        'note'            => $q['note'] ?? null,
                        'is_refer_case'   => (bool)($q['is_refer_case'] ?? false),
                        'type'            => trim((string)$q['type']),

                        'created_by'      => $q['created_by'] ?? $createdBy,

                        'created_at'      => $q['created_at'] ?? $now,
                        'updated_at'      => $now,
                    ];
                })->all();

                foreach ($rows as $row) {
                    QuestionResult::create($row);
                }

                // เคลียร์ cache summary ให้ Dashboard เห็นผลทันที
                $this->clearSummaryCaches();

                return $this->respondApi('FORM_SAVED', 'บันทึกแบบฟอร์มสำเร็จ', [
                    'case_id' => $validated['case_id'],
                ], null, 201);
            });
        } catch (QueryException $e) {
            Log::error('[FormPPK] store failed: DB', ['error' => $e->getMessage()]);
            $status = $this->mapQueryExceptionStatus($e);
            $code   = ($status === 409) ? 'DUPLICATE_CASE' : 'DB_ERROR';
            $msg    = ($status === 409) ? 'case_id ซ้ำหรือผิดเงื่อนไข' : 'เกิดข้อผิดพลาดฐานข้อมูล';
            return $this->respondApi($code, $msg, null, null, $status, ['exception' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('[FormPPK] store failed: Unexpected', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->respondApi('UNEXPECTED_ERROR', 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', null, null, 500, [
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
        }
    }

    public function show($case_id)
    {
        $patient = PatientCase::with('questionResults')->where('case_id', $case_id)->first();

        if (!$patient) {
            return $this->respondApi('CASE_NOT_FOUND', 'ไม่พบข้อมูลเคสที่ร้องขอ', null, null, 404);
        }

        return $this->respondApi('CASE_FOUND', 'ดึงข้อมูลเคสสำเร็จ', $patient->toArray());
    }

    public function update(Request $request, $case_id)
    {
        $patient = PatientCase::where('case_id', $case_id)->first();
        if (!$patient) {
            return $this->respondApi('CASE_NOT_FOUND', 'ไม่พบข้อมูลเคสที่ร้องขอ', null, null, 404);
        }

        // เปลี่ยน validation: routed_by -> created_by (integer + exists:users,id)
        $validator = Validator::make($request->all(), [
            'cid'                 => 'sometimes|string',
            'name'                => 'sometimes|string',
            'age'                 => 'sometimes|integer',
            'gender'              => 'sometimes|string',
            'maininscl_name'      => 'nullable|string',
            'hmain_name'          => 'nullable|string',
            'summary_clinics'     => 'sometimes|array',
            'summary_clinics.*'   => 'string',
            'symptoms'            => 'nullable|array',
            'symptoms.*'          => 'string',

            'question_results'                        => 'sometimes|array',
            'question_results.*.question'             => 'required_with:question_results|string',
            'question_results.*.question_key'         => 'required_with:question_results|string',
            'question_results.*.question_code'        => 'required_with:question_results|integer',
            'question_results.*.question_title'       => 'required_with:question_results|string',
            'question_results.*.clinic'               => 'required_with:question_results|array',
            'question_results.*.clinic.*'             => 'string',
            'question_results.*.symptoms'             => 'nullable|array',
            'question_results.*.symptoms.*'           => 'string',
            'question_results.*.note'                 => 'nullable|string',
            'question_results.*.is_refer_case'        => 'required_with:question_results|boolean',
            'question_results.*.type'                 => 'required_with:question_results|string|in:form,guide,referral,kiosk',
            'question_results.*.created_by'           => 'nullable|integer|exists:users,id', // <-- แก้ตรงนี้
            'question_results.*.created_at'           => 'nullable|date_format:Y-m-d H:i:s',
        ]);

        if ($validator->fails()) {
            return $this->respondApi('VALIDATION_FAILED', 'ข้อมูลไม่ถูกต้อง', null, $validator->errors()->toArray(), 422);
        }

        $validated = $validator->validated();

        $main = array_key_exists('maininscl_name', $validated)
            ? (trim((string)$validated['maininscl_name']) ?: 'ไม่มีการบันทึกสิทธิการรักษา')
            : $patient->maininscl_name;

        $hmain = array_key_exists('hmain_name', $validated)
            ? (trim((string)$validated['hmain_name']) ?: 'ไม่มีการบันทึกสิทธิการรักษา')
            : $patient->hmain_name;

        try {
            return DB::transaction(function () use ($request, $patient, $validated, $main, $hmain) {
                // ดึง user id สำหรับ fallback หาก FE ไม่ส่ง created_by มา
                $currentUserId = $request->user()?->id ?? null;

                $patient->update([
                    'cid'             => $validated['cid']            ?? $patient->cid,
                    'name'            => $validated['name']           ?? $patient->name,
                    'age'             => $validated['age']            ?? $patient->age,
                    'gender'          => $validated['gender']         ?? $patient->gender,
                    'maininscl_name'  => $main,
                    'hmain_name'      => $hmain,
                    'summary_clinics' => isset($validated['summary_clinics'])
                        ? $this->cleanStringArray($validated['summary_clinics'])
                        : $patient->summary_clinics,
                    'symptoms'        => isset($validated['symptoms'])
                        ? $this->cleanStringArray($validated['symptoms'])
                        : $patient->symptoms,
                ]);

                if (!empty($validated['question_results'])) {
                    // ลบของเดิมก่อนใส่ใหม่ (ยังคงพฤติกรรมเดิม)
                    $patient->questionResults()->delete();

                    $now  = now();
                    $rows = collect($validated['question_results'])->map(function ($q) use ($patient, $now, $currentUserId) {
                        $clinic   = $this->cleanStringArray($q['clinic'] ?? []);
                        $symptoms = $this->normalizeSymptoms(
                            $q['symptoms'] ?? [],
                            $q['question_title'] ?? null,
                            $q['question_key'] ?? null,
                            $q['question'] ?? null
                        );

                        return [
                            'patient_case_id' => $patient->id,
                            'case_id'         => $patient->case_id,
                            'question'        => $q['question'],
                            'question_key'    => $q['question_key'],
                            'question_code'   => $q['question_code'],
                            'question_title'  => $q['question_title'],
                            'clinic'          => $clinic,
                            'symptoms'        => $symptoms,
                            'note'            => $q['note'] ?? null,
                            'is_refer_case'   => (bool)($q['is_refer_case'] ?? false),
                            'type'            => trim((string)$q['type']),

                            // เปลี่ยนเป็น created_by (FK) แทน routed_by(string)
                            'created_by'      => $q['created_by'] ?? $currentUserId,

                            'created_at'      => $q['created_at'] ?? $now,
                            'updated_at'      => $now,
                        ];
                    })->all();

                    foreach ($rows as $row) {
                        QuestionResult::create($row);
                    }
                }

                // เคลียร์ cache summary
                $this->clearSummaryCaches();

                return $this->respondApi('FORM_UPDATED', 'อัปเดตแบบฟอร์มสำเร็จ', [
                    'case_id' => $patient->case_id,
                ]);
            });
        } catch (QueryException $e) {
            Log::error('[FormPPK] update failed: DB', ['error' => $e->getMessage()]);
            $status = $this->mapQueryExceptionStatus($e);
            $code   = ($status === 409) ? 'CONFLICT' : 'DB_ERROR';
            $msg    = ($status === 409) ? 'ข้อมูลขัดแย้ง/ถูกล็อก' : 'เกิดข้อผิดพลาดฐานข้อมูล';
            return $this->respondApi($code, $msg, null, null, $status, ['exception' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('[FormPPK] update failed: Unexpected', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->respondApi('UNEXPECTED_ERROR', 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', null, null, 500, [
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
        }
    }

    public function destroy($case_id)
    {
        $patient = PatientCase::where('case_id', $case_id)->first();

        if (!$patient) {
            return $this->respondApi('CASE_NOT_FOUND', 'ไม่พบข้อมูลเคสที่ร้องขอ', null, null, 404);
        }

        try {
            return DB::transaction(function () use ($patient) {
                $patient->questionResults()->delete();
                $patient->delete();

                // เคลียร์ cache summary
                $this->clearSummaryCaches();

                return $this->respondApi('FORM_DELETED', 'ลบเคสสำเร็จ', [
                    'case_id' => $patient->case_id,
                ]);
            });
        } catch (QueryException $e) {
            Log::error('[FormPPK] destroy failed: DB', ['error' => $e->getMessage()]);
            $status = $this->mapQueryExceptionStatus($e);
            $code   = ($status === 409) ? 'CONFLICT' : 'DB_ERROR';
            $msg    = ($status === 409) ? 'ข้อมูลขัดแย้ง/ถูกล็อก' : 'เกิดข้อผิดพลาดฐานข้อมูล';
            return $this->respondApi($code, $msg, null, null, $status, ['exception' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('[FormPPK] destroy failed: Unexpected', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->respondApi('UNEXPECTED_ERROR', 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', null, null, 500, [
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
        }
    }

   public function summary(Request $request, SummaryService $summaryService)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $summary = $summaryService->getSummary('form', $startDate, $endDate);

        // บังคับให้เป็น array ก่อนส่ง
        $summaryArr = is_array($summary)
            ? $summary
            : ( $summary instanceof \Illuminate\Contracts\Support\Arrayable ? $summary->toArray()
            : ( $summary instanceof \JsonSerializable ? $summary->jsonSerialize()
                : (array) $summary ));

        return $this->respondApi('SUMMARY_FETCHED', 'ดึงสรุปสำเร็จ', $summaryArr);
    }

    /* ===================== NEW: ดูช่วงเวลาแบบ POST + พรีเซ็ต ===================== */

    // routes/api.php:
    // Route::post('/patients/history', [FormPPKController::class, 'historyPost']);
    // Route::post('/form-ppk/show', [FormPPKController::class, 'showPost']);

    /**
     * POST /patients/history
     * Body:
     *  - cid: string (required)
     *  - range: string in [today, yesterday, last_7d, last_30d, this_month, prev_month, this_quarter, this_year]
     *  - start_date/end_date: YYYY-MM-DD (optional; override range if provided)
     *  - q: string (optional; search in case_id/name)
     *  - page, per_page
     */
    public function historyPost(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cid'        => ['required','string'],
            'range'      => ['nullable','string'],
            'start_date' => ['nullable','date_format:Y-m-d'],
            'end_date'   => ['nullable','date_format:Y-m-d'],
            'q'          => ['nullable','string'],
            'page'       => ['nullable','integer','min:1'],
            'per_page'   => ['nullable','integer','min:1','max:100'],
        ]);

        if ($validator->fails()) {
            return $this->respondApi('VALIDATION_FAILED', 'ข้อมูลไม่ถูกต้อง', null, $validator->errors()->toArray(), 422);
        }

        $validated = $validator->validated();

        [$startAt, $endAt] = $this->resolveDateRange(
            $validated['start_date'] ?? null,
            $validated['end_date']   ?? null,
            $validated['range']      ?? null
        );

        $perPage = $validated['per_page'] ?? 20;

        try {
            $query = PatientCase::query()
                ->where('cid', $validated['cid'])
                ->when($startAt && $endAt, fn ($q) => $q->whereBetween('created_at', [$startAt, $endAt]))
                ->when(!empty($validated['q'] ?? null), function($qq) use ($validated) {
                    $kw = trim($validated['q']);
                    $qq->where(function($w) use ($kw){
                        $w->where('case_id','like',"%$kw%")
                        ->orWhere('name','like',"%$kw%");
                    });
                })
                ->orderByDesc('created_at')
                // ต้องดึง symptoms มาด้วย เพื่อใช้เป็น headline
                ->select(['id','case_id','cid','name','created_at','summary_clinics','symptoms'])
                // ดึงหัวข้อรายการแรกจาก question_results ด้วย subquery (ไม่ทำ N+1)
                ->addSelect([
                    'first_title' => QuestionResult::select('question_title')
                        ->whereColumn('case_id', 'patient_cases.case_id')
                        ->orderBy('created_at', 'asc')
                        ->limit(1),
                    'first_question' => QuestionResult::select('question')
                        ->whereColumn('case_id', 'patient_cases.case_id')
                        ->orderBy('created_at', 'asc')
                        ->limit(1),
                ]);

            $p = $query->paginate($perPage);

            // map ผลลัพธ์ให้อยู่ในรูปแบบเบา + มี headline
            $items = collect($p->items())->map(function ($c) {
                // PatientCase มี cast 'symptoms' => 'array' อยู่แล้ว
                $sym = $c->symptoms ?? [];

                // กำหนด headline: symptoms(1–2 อันแรก) -> first_title -> first_question -> (สุดท้ายไม่มี)
                $headline = null;
                if (!empty($sym)) {
                    $headline = implode(', ', array_slice($sym, 0, 2));
                }
                if (!$headline && !empty($c->first_title))   $headline = $c->first_title;
                if (!$headline && !empty($c->first_question)) $headline = $c->first_question;

                return [
                    'case_id'         => $c->case_id,                                // ใช้เป็น key ภายใน FE
                    'name'            => $c->name,
                    'created_at'      => optional($c->created_at)->format('Y-m-d H:i:s'),
                    'summary_clinics' => $c->summary_clinics ?? [],
                    'symptoms'        => $sym,
                    'headline'        => $headline,                                   // << ใหม่: โรค/อาการหลัก
                ];
            })->all();

            return $this->respondApi('HISTORY_FETCHED', 'ดึงประวัติสำเร็จ', [
                'items' => $items,
                'meta'  => [
                    'current_page' => $p->currentPage(),
                    'per_page'     => $p->perPage(),
                    'total'        => $p->total(),
                    'last_page'    => $p->lastPage(),
                    'applied_range'=> isset($startAt, $endAt) ? [
                        'from' => $startAt->toDateString(),
                        'to'   => $endAt->toDateString(),
                    ] : null,
                    'q'            => $validated['q'] ?? null,
                ],
            ]);
        } catch (QueryException $e) {
            Log::error('[FormPPK] historyPost failed: DB', ['error' => $e->getMessage()]);
            $status = $this->mapQueryExceptionStatus($e);
            $code   = ($status === 409) ? 'CONFLICT' : 'DB_ERROR';
            $msg    = ($status === 409) ? 'ข้อมูลขัดแย้ง/ถูกล็อก' : 'เกิดข้อผิดพลาดฐานข้อมูล';
            return $this->respondApi($code, $msg, null, null, $status, ['exception' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('[FormPPK] historyPost failed: Unexpected', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->respondApi('UNEXPECTED_ERROR', 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', null, null, 500, [
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
        }
    }

    /**
     * POST /form-ppk/show
     * Body: { "case_id": "..." }
     */
    public function showPost(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'case_id' => ['required','string'],
        ]);

        if ($validator->fails()) {
            return $this->respondApi('VALIDATION_FAILED', 'ข้อมูลไม่ถูกต้อง', null, $validator->errors()->toArray(), 422);
        }

        $validated = $validator->validated();

        try {
            $patient = PatientCase::with(['questionResults' => function ($q) {
                    $q->orderBy('created_at', 'asc');
                }])
                ->where('case_id', $validated['case_id'])
                ->first();

            if (!$patient) {
                return $this->respondApi('CASE_NOT_FOUND', 'ไม่พบข้อมูลเคสที่ร้องขอ', null, null, 404);
            }

            return $this->respondApi('CASE_FOUND', 'ดึงข้อมูลเคสสำเร็จ', $patient->toArray());
        } catch (QueryException $e) {
            Log::error('[FormPPK] showPost failed: DB', ['error' => $e->getMessage()]);
            $status = $this->mapQueryExceptionStatus($e);
            $code   = ($status === 409) ? 'CONFLICT' : 'DB_ERROR';
            $msg    = ($status === 409) ? 'ข้อมูลขัดแย้ง/ถูกล็อก' : 'เกิดข้อผิดพลาดฐานข้อมูล';
            return $this->respondApi($code, $msg, null, null, $status, ['exception' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('[FormPPK] showPost failed: Unexpected', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->respondApi('UNEXPECTED_ERROR', 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', null, null, 500, [
                'exception' => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
        }
    }

    /**
     * เคลียร์ cache ของ SummaryService เพื่อให้ dashboard เห็นผลล่าสุด
     */
    protected function clearSummaryCaches(): void
    {
        Cache::forget('summary_form');
        Cache::forget('summary_total');
        Cache::forget('summary_combined');
    }

    /* ------------------------------ Helpers ------------------------------ */

    /**
     * ตัดค่าว่าง/ไม่ใช่ string ออก และ trim ทุกค่า
     */
    protected function cleanStringArray($array): array
    {
        $arr = is_array($array) ? $array : [];
        $arr = array_values(array_filter(array_map(function ($v) {
            if (!is_string($v)) return null;
            $v = trim($v);
            return $v === '' ? null : $v;
        }, $arr)));
        return array_values(array_unique($arr)); // กันซ้ำเพิ่ม
    }
    /**
     * ทำให้ symptoms เป็นภาษาไทยสวย ๆ:
     * - กรอง *_note, note, within72, flag ออก
     * - ถ้าทั้งหมดเป็น slug อังกฤษล้วนและมี $title → ใช้ $title เพียงตัวเดียว
     * - ถ้าว่าง → fallback เป็น $title -> $key -> $question (โดยตัด *_note)
     */
    protected function normalizeSymptoms($symptoms, ?string $title, ?string $key, ?string $question): array
    {
        $raw = $this->cleanStringArray($symptoms);

        // กรองโน้ต/ธงที่ไม่ใช่อาการ
        $raw = array_values(array_filter($raw, function ($t) {
            $low = strtolower($t);
            if (preg_match('/(^|_)note$/i', $t)) return false;
            if (in_array($low, ['within72', 'flag', 'note'], true)) return false;
            return true;
        }));

        // ถ้าเหลือเป็น slug อังกฤษล้วน → ใช้ title
        if (!empty($raw)) {
            $allSlug = true;
            foreach ($raw as $t) {
                $t2 = str_replace('_', ' ', $t);
                if (preg_match('/^[A-Za-z0-9 ]+$/', $t2) !== 1) { $allSlug = false; break; }
            }
            if ($allSlug && $title) {
                return [trim($title)];
            }

            // มีไทยอยู่แล้ว → normalize ช่องว่าง + unique
            $clean = array_values(array_unique(array_map(function ($t) {
                return preg_replace('/\s+/u', ' ', trim($t));
            }, $raw)));

            if (!empty($clean)) return $clean;
        }

        // Fallback
        foreach ([$title, $key, $question] as $cand) {
            if (is_string($cand)) {
                $cand = trim($cand);
                if ($cand !== '' && !preg_match('/(^|_)note$/i', $cand)) {
                    return [$cand];
                }
            }
        }

        return [];
    }

    /**
     * แปลงช่วงวันที่ให้ง่ายสุด:
     * - ถ้าส่ง start_date / end_date มา → ใช้คู่นั้น (ถ้าสลับลำดับจะสลับให้)
     * - ถ้าไม่ส่ง → ใช้ range preset
     * Supported range:
     *   today, yesterday, last_7d, last_30d, this_month, prev_month, this_quarter, this_year
     * คืนค่าเป็น [Carbon $startAt, $endAt] แบบ startOfDay/endOfDay โซน Asia/Bangkok
     */
    protected function resolveDateRange(?string $startDate, ?string $endDate, ?string $range): array
    {
        $tz = 'Asia/Bangkok';
        $now = Carbon::now($tz);

        // 1) ถ้ามี start/end มาก่อน → ใช้เลย
        if ($startDate || $endDate) {
            $s = $startDate ? Carbon::createFromFormat('Y-m-d', $startDate, $tz)->startOfDay() : null;
            $e = $endDate   ? Carbon::createFromFormat('Y-m-d', $endDate,   $tz)->endOfDay()   : null;

            if ($s && !$e) $e = (clone $s)->endOfDay();      // วันเดียว
            if ($e && !$s) $s = (clone $e)->startOfDay();

            // ถ้าสลับลำดับ → สลับให้
            if ($s && $e && $s->greaterThan($e)) {
                [$s, $e] = [$e->copy()->startOfDay(), $s->copy()->endOfDay()];
            }
            return [$s, $e];
        }

        // 2) ใช้พรีเซ็ต range
        $r = strtolower((string)$range);
        switch ($r) {
            case 'today':
            default:
                $start = $now->copy()->startOfDay();
                $end   = $now->copy()->endOfDay();
                break;

            case 'yesterday':
                $start = $now->copy()->subDay()->startOfDay();
                $end   = $now->copy()->subDay()->endOfDay();
                break;

            case 'last_7d':
                $start = $now->copy()->subDays(6)->startOfDay(); // รวมวันนี้ = 7 วัน
                $end   = $now->copy()->endOfDay();
                break;

            case 'last_30d':
                $start = $now->copy()->subDays(29)->startOfDay();
                $end   = $now->copy()->endOfDay();
                break;

            case 'this_month':
                $start = $now->copy()->startOfMonth();
                $end   = $now->copy()->endOfMonth();
                break;

            case 'prev_month':
                $start = $now->copy()->subMonthNoOverflow()->startOfMonth();
                $end   = $now->copy()->subMonthNoOverflow()->endOfMonth();
                break;

            case 'this_quarter':
                $q = intval(ceil($now->month / 3));
                $startMonth = ($q - 1) * 3 + 1;
                $start = $now->copy()->setMonth($startMonth)->startOfMonth();
                $end   = $start->copy()->addMonths(2)->endOfMonth();
                break;

            case 'this_year':
                $start = $now->copy()->startOfYear();
                $end   = $now->copy()->endOfYear();
                break;
        }

        return [$start, $end];
    }
}
