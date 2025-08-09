<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('diseases', function (Blueprint $table) {
            $table->id();
            $table->string('name_th'); // ชื่อภาษาไทย
            $table->string('name_en')->nullable(); // ชื่อภาษาอังกฤษ
            $table->string('icd_10')->nullable(); // รหัส ICD
            $table->enum('category', ['2 ชั่วโมง', '24 ชั่วโมง', '48 ชั่วโมง']); // หมวดเวลา
            $table->boolean('alert')->default(false); 
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diseases');
    }
};
