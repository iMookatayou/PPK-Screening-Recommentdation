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
            $table->char('cid', 13)->index();            // เลขบัตร 13 หลัก
            $table->string('name', 191);                 // ชื่อ-สกุล
            $table->unsignedTinyInteger('age');          // 0–255
            $table->string('gender', 16);                // M, F, U

            // สิทธิการรักษา
            $table->string('maininscl_name', 100)->nullable(); // สิทธิ เช่น บัตรทอง
            $table->string('hmain_name', 150)->nullable();     // รพ.หลัก

            // สรุป/อาการ
            $table->json('summary_clinics')->nullable();
            $table->json('symptoms')->nullable();

            $table->timestamps();

            // ดัชนีเสริม
            $table->index('created_at');
            $table->index(['cid', 'created_at'], 'patient_cases_cid_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_cases');
    }
};
