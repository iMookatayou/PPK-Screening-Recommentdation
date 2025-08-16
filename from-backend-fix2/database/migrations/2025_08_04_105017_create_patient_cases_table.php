<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('patient_cases', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->id(); // BIGINT UNSIGNED PK

            // รหัสเคส — ปกติ UUID/รหัสเอง ยาวไม่เกิน 64 พอ
            $table->string('case_id', 64)->unique();

            // ข้อมูลผู้ป่วยหลัก
            $table->string('cid', 13)->index();    // เลขบัตร 13 หลัก
            $table->string('name', 191);
            $table->unsignedTinyInteger('age');    // 0–255 พอสำหรับอายุ
            $table->string('gender', 16);          // หรือจะใช้ enum('M','F','U') ก็ได้

            // สิทธิการรักษา
            $table->string('maininscl_name')->nullable();
            $table->string('hmain_name')->nullable();

            // สรุป/อาการ
            $table->json('summary_clinics')->nullable();
            $table->json('symptoms')->nullable();

            $table->timestamps();

            // ดัชนีเสริมให้คิวรีเร็วขึ้นตามการใช้งานจริง
            $table->index('created_at');
            $table->index(['cid', 'created_at'], 'patient_cases_cid_created_idx');
        });
    }

    public function down(): void
    {
        // ต้องลบตาราง patient_cases ไม่ใช่ personal_access_tokens
        Schema::dropIfExists('patient_cases');
    }
};
