<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('diseases', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');

            $table->string('name_th', 150);               // ชื่อภาษาไทย
            $table->string('name_en', 200)->default('');  // ชื่อภาษาอังกฤษ (optional)
            $table->string('icd_10', 500)->default('');   // เก็บรหัส ICD-10 หลายตัว

            // หมวดเวลา (enum ใช้ string ภาษาไทยได้ แต่ต้องชัวร์ว่า DB collation = utf8mb4)
            $table->enum('category', ['2 ชั่วโมง', '24 ชั่วโมง', '48 ชั่วโมง']);

            // แจ้งเตือน (default false)
            $table->boolean('alert')->default(false);

            $table->timestamps();

            // Index สำหรับค้นหา
            $table->index('icd_10');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diseases');
    }
};
