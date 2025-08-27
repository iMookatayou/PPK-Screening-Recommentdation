<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('patient_cases', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');                // BIGINT UNSIGNED PK

            // รหัสเคส — UUID/รหัสเอง ยาวไม่เกิน 64
            $table->string('case_id', 64)->unique();

            // ข้อมูลผู้ป่วยหลัก
            $table->char('cid', 13)->index();           // เลขบัตร 13 หลัก
            $table->string('name', 191);                // ชื่อ-สกุล
            $table->unsignedTinyInteger('age');         // 0–255
            $table->string('gender', 16);               // M, F, U

            // สิทธิการรักษา (ไม่ nullable → ตั้ง default '' ได้)
            $table->string('maininscl_name', 100)->default('');
            $table->string('hmain_name', 150)->default('');

            // สรุป/อาการ (JSON ใน MySQL 5.x: ห้าม DEFAULT → ให้ส่งค่ามาเอง/ตั้งที่ Model)
            $table->json('summary_clinics');            // ต้องเป็น JSON valid เสมอ เช่น []
            $table->json('symptoms');                   // ต้องเป็น JSON valid เสมอ เช่น []

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
