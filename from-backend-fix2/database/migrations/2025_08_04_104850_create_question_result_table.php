<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_results', function (Blueprint $table) {
            $table->id();

            $table->string('case_id')->index();              // FK เชื่อมกับ patient_cases
            $table->string('question');                      // โค้ดคำถาม เช่น StrokeSuspect
            $table->string('question_key');                  // เช่น Question1
            $table->integer('question_code');                // เช่น 1
            $table->string('question_title');                // ชื่อคำถาม

            $table->json('clinic');                          // หลายคลินิก เช่น ["er", "surgery"]
            $table->json('symptoms')->nullable();            // อาการ
            $table->text('note')->nullable();                // หมายเหตุ

            $table->boolean('is_refer_case')->default(false);// เป็นเคสส่งต่อหรือไม่
            $table->string('type')->default('form');         // ประเภท ('form', 'guide', etc.)
            $table->string('routed_by')->nullable();         // ถูก route โดยใคร

            $table->timestamp('created_at')->nullable();     // created_at ที่มากับข้อมูล
            $table->timestamp('updated_at')->nullable();     // สำหรับอัปเดตภายหลัง (auto)

            // $table->foreign('case_id')->references('case_id')->on('patient_cases')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
