<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('diseases', function (Blueprint $table) {
            $table->id();
            $table->string('name_th', 150);           // varchar(150) ชื่อภาษาไทย
            $table->string('name_en', 200)->nullable(); // varchar(200) ชื่อภาษาอังกฤษ
            $table->string('icd_10', 500)->nullable(); // varchar(10) รหัส ICD-10
            $table->enum('category', ['2 ชั่วโมง', '24 ชั่วโมง', '48 ชั่วโมง']); // หมวดเวลา
            $table->boolean('alert')->default(false); 
            $table->timestamps();

            // ดัชนีเพื่อการค้นหา
            $table->index('icd_10');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diseases');
    }
};
