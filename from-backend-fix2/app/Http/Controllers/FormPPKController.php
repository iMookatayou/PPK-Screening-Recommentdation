<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\PatientCase;
use App\Models\QuestionResult;

class FormPPKController extends Controller
{
    // INDEX – ดึงรายการทั้งหมด
    public function index()
    {
        try {
            $patients = PatientCase::with('questionResults')->latest()->get();
            return response()->json($patients);
        } catch (\Exception $e) {
            Log::error('Fetch patient case list failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch case list'], 500);
        }
    }

    // STORE – บันทึกเคสใหม่
    public function store(Request $request)
    {
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
            'question_results' => 'required|array',
            'question_results.*.question' => 'required|string',
            'question_results.*.question_code' => 'required|integer',
            'question_results.*.question_title' => 'required|string',
            'question_results.*.clinic' => 'required|array',
            'question_results.*.symptoms' => 'nullable|array',
            'question_results.*.note' => 'nullable|string',
            'question_results.*.is_refer_case' => 'required|boolean',
            'question_results.*.type' => 'required|string',
        ]);

        try {
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

            foreach ($validated['question_results'] as $result) {
                $patient->questionResults()->create([
                    ...$result,
                    'case_id' => $validated['case_id'],
                    'symptoms' => $result['symptoms'] ?? [],
                    'type' => $result['type'], 
                ]);
            }

            return response()->json(['message' => 'Data saved successfully'], 201);
        } catch (\Exception $e) {
            Log::error('FormPPK save failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Save failed'], 500);
        }
    }

    // SHOW – แสดงเคสเดียว
    public function show($case_id)
    {
        $patient = PatientCase::with('questionResults')->where('case_id', $case_id)->first();

        if (!$patient) {
            return response()->json(['error' => 'Case not found'], 404);
        }

        return response()->json($patient);
    }

    // UPDATE – อัปเดตเคส
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
            'question_results.*.question_code' => 'required_with:question_results|integer',
            'question_results.*.question_title' => 'required_with:question_results|string',
            'question_results.*.clinic' => 'required_with:question_results|array',
            'question_results.*.symptoms' => 'nullable|array',
            'question_results.*.note' => 'nullable|string',
            'question_results.*.is_refer_case' => 'required_with:question_results|boolean',
            'question_results.*.type' => 'required_with:question_results|string', 
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
                        ...$result,
                        'case_id' => $patient->case_id,
                        'symptoms' => $result['symptoms'] ?? [],
                        'type' => $result['type'], 
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

    // DELETE – ลบเคส
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
}
