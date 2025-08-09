<?php

// app/Http/Controllers/DiseaseController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Disease;

class DiseaseController extends Controller
{
    public function index()
    {
        return response()->json(
            Disease::select('id', 'name_th', 'name_en', 'icd_10', 'category', 'alert')
                ->orderBy('category')
                ->get()
        );
    }
}
