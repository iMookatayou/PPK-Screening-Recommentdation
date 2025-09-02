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
            $table->id();

            // FK → patient_cases.id (ลบแม่ ลบลูก)
            $table->foreignId('patient_case_id')
                  ->constrained('patient_cases')
                  ->cascadeOnDelete();

            // รหัสเคส (UUID/trace)
            $table->string('case_id', 64)->index();

            // เมตาของคำถาม
            $table->string('question', 100);
            $table->string('question_key', 100);
            $table->unsignedSmallInteger('question_code');
            $table->string('question_title', 255);

            // ผลลัพธ์ (JSON: ไม่ตั้ง DEFAULT ให้ DB / ให้ Model ตั้งค่าเริ่มต้นเอง)
            $table->json('clinic');     // ตัวอย่าง: ["er","surgery"]
            $table->json('symptoms');   // ตัวอย่าง: []

            // อื่น ๆ
            $table->string('note', 500)->default('');
            $table->boolean('is_refer_case')->default(false);
            $table->string('type', 20)->default('form'); // 'form' | 'guide' | ...

            // 🔑 ผู้สร้างรายการ (ใครคัดกรอง) → users.id
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete()
                  ->index(); // เสริม index สำหรับค้นตามผู้ใช้

            $table->timestamps();

            // ดัชนีเสริม
            $table->index(['type', 'created_at']);
            $table->index(['patient_case_id', 'created_at']);

            // ป้องกันซ้ำ: เคสเดียวกันห้ามมี question_key ซ้ำ
            $table->unique(['patient_case_id', 'question_key'], 'qr_case_question_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
