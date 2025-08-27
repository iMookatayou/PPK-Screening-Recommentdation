<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_results', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            // PK
            $table->id(); // เท่ากับ bigIncrements('id')

            // FK → patient_cases.id (ลบแม่ ลบลูก)
            $table->foreignId('patient_case_id')
                  ->constrained('patient_cases')
                  ->cascadeOnDelete();

            // อ้างอิงรหัสเคส (สำหรับ join/trace)
            $table->string('case_id', 64)->index();     // UUID/รหัสเคส

            // เมตาของคำถาม
            $table->string('question', 100);            // เช่น "HandInjury"
            $table->string('question_key', 100);        // เช่น "q_hand_injury"
            $table->unsignedSmallInteger('question_code');
            $table->string('question_title', 255);

            // ผลลัพธ์ (JSON ห้าม null → ฝั่งแอปต้องส่งค่าเสมอ เช่น []/["er"])
            $table->json('clinic');                     // ตัวอย่าง: ["er","surgery"]
            $table->json('symptoms');                   // ตัวอย่าง: []

            // ข้อความเพิ่มเติม (ใช้ VARCHAR เพื่อให้ตั้ง default ได้)
            $table->string('note', 500)->default('');

            $table->boolean('is_refer_case')->default(false);
            $table->string('type', 20)->default('form');    // 'form' | 'guide'
            $table->string('routed_by', 100)->default('');  // user id/name

            $table->timestamps();

            // ดัชนีเสริม
            $table->index(['type', 'created_at']);
            $table->index(['patient_case_id', 'created_at']);

            // ป้องกันซ้ำ: เคสเดียวกันห้ามมี question_key เดิม
            $table->unique(['patient_case_id', 'question_key'], 'qr_case_question_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
