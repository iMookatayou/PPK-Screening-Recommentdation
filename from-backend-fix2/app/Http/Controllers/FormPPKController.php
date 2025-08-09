<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\PatientCase;
use App\Services\SummaryService;

class FormPPKController extends Controller
{
    public function store(Request $request)
    {
        Log::info('[FormPPK] เริ่มรับข้อมูล form-ppk', $request->all());

        $validated = $request->validate([
            'case_id' => 'required|string|unique:patient_cases,case_id',
            'cid' => 'required|string',
            'name' => 'required|string',
            'age' => 'required|integer',
            'gender' => 'required|string',
            'maininscl_name' => 'nullable|string',
            'hmain_name' => 'nullable|string',
            'summary_clinics' => 'required|array',
            'symptoms' => 'nullable|array',
            'question_results' => 'required|array|min:1',
            'question_results.*.question' => 'required|string',
            'question_results.*.question_key' => 'required|string',
            'question_results.*.question_code' => 'required|integer',
            'question_results.*.question_title' => 'required|string',
            'question_results.*.clinic' => 'required|array',
            'question_results.*.symptoms' => 'nullable|array',
            'question_results.*.note' => 'nullable|string',
            'question_results.*.is_refer_case' => 'required|boolean',
            'question_results.*.type' => 'required|string',
            'question_results.*.routed_by' => 'nullable|string',
            'question_results.*.created_at' => 'nullable|string',
        ]);

        try {
            $user = $request->user();
            $routedBy = $user->username ?? $user->name ?? 'unknown';

            $patient = PatientCase::create([
                'case_id' => $validated['case_id'],
                'cid' => $validated['cid'],
                'name' => $validated['name'],
                'age' => $validated['age'],
                'gender' => $validated['gender'],
                'maininscl_name' => $validated['maininscl_name'] ?? null,
                'hmain_name' => $validated['hmain_name'] ?? null,
                'summary_clinics' => $validated['summary_clinics'],
                'symptoms' => $validated['symptoms'] ?? [],
            ]);

            foreach ($validated['question_results'] as $index => $result) {
                try {
                    $patient->questionResults()->create([
                        'case_id'        => $validated['case_id'],
                        'question'       => $result['question'],
                        'question_key'   => $result['question_key'],
                        'question_code'  => $result['question_code'],
                        'question_title' => $result['question_title'],
                        'clinic'         => $result['clinic'],
                        'symptoms'       => $result['symptoms'] ?? [],
                        'note'           => $result['note'] ?? null,
                        'is_refer_case'  => $result['is_refer_case'],
                        'type'           => $result['type'],
                        'routed_by'      => $result['routed_by'] ?? $routedBy,
                        'created_at'     => $result['created_at'] ?? now(),
                    ]);
                } catch (\Exception $e) {
                    Log::error("[FormPPK] บันทึก question_results ล้มเหลว index {$index}", [
                        'error' => $e->getMessage(),
                        'data' => $result,
                    ]);
                }
            }

            return response()->json(['message' => 'Data saved successfully'], 201);
        } catch (\Exception $e) {
            Log::error('[FormPPK] บันทึกเคสล้มเหลว', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Save failed'], 500);
        }
    }

    public function show($case_id)
    {
        $patient = PatientCase::with('questionResults')->where('case_id', $case_id)->first();

        if (!$patient) {
            return response()->json(['error' => 'Case not found'], 404);
        }

        return response()->json($patient);
    }

    public function update(Request $request, $case_id)
    {
        $patient = PatientCase::where('case_id', $case_id)->first();

        if (!$patient) {
            return response()->json(['error' => 'Case not found'], 404);
        }

        $validated = $request->validate([
            'cid' => 'sometimes|string',
            'name' => 'sometimes|string',
            'age' => 'sometimes|integer',
            'gender' => 'sometimes|string',
            'maininscl_name' => 'nullable|string',
            'hmain_name' => 'nullable|string',
            'summary_clinics' => 'sometimes|array',
            'symptoms' => 'nullable|array',
            'question_results' => 'sometimes|array',
            'question_results.*.question' => 'required_with:question_results|string',
            'question_results.*.question_key' => 'required_with:question_results|string',
            'question_results.*.question_code' => 'required_with:question_results|integer',
            'question_results.*.question_title' => 'required_with:question_results|string',
            'question_results.*.clinic' => 'required_with:question_results|array',
            'question_results.*.symptoms' => 'nullable|array',
            'question_results.*.note' => 'nullable|string',
            'question_results.*.is_refer_case' => 'required_with:question_results|boolean',
            'question_results.*.type' => 'required_with:question_results|string',
            'question_results.*.routed_by' => 'nullable|string',
            'question_results.*.created_at' => 'nullable|string',
        ]);

        try {
            $patient->update([
                ...$validated,
                'symptoms' => $validated['symptoms'] ?? $patient->symptoms,
            ]);

            if (!empty($validated['question_results'])) {
                $patient->questionResults()->delete();

                foreach ($validated['question_results'] as $result) {
                    $patient->questionResults()->create([
                        'case_id'        => $patient->case_id,
                        'question'       => $result['question'],
                        'question_key'   => $result['question_key'],
                        'question_code'  => $result['question_code'],
                        'question_title' => $result['question_title'],
                        'clinic'         => $result['clinic'],
                        'symptoms'       => $result['symptoms'] ?? [],
                        'note'           => $result['note'] ?? null,
                        'is_refer_case'  => $result['is_refer_case'],
                        'type'           => $result['type'],
                        'routed_by'      => $result['routed_by'] ?? 'unknown',
                        'created_at'     => $result['created_at'] ?? now(),
                    ]);
                }
            }

            return response()->json(['message' => 'Updated successfully']);
        } catch (\Exception $e) {
            Log::error('FormPPK update failed', [
                'case_id' => $case_id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Update failed'], 500);
        }
    }

    public function destroy($case_id)
    {
        $patient = PatientCase::where('case_id', $case_id)->first();

        if (!$patient) {
            return response()->json(['error' => 'Case not found'], 404);
        }

        try {
            $patient->questionResults()->delete();
            $patient->delete();

            return response()->json(['message' => 'Case deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Delete case failed', [
                'case_id' => $case_id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Delete failed'], 500);
        }
    }

    public function summary(Request $request, SummaryService $summaryService)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $summary = $summaryService->getSummary('formppk', $startDate, $endDate);

        return response()->json([
            'message' => 'Summary fetched successfully',
            'data'    => $summary,
        ], 200);
    }
}
