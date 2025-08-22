<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_results', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->id();

            // FK ไป patient_cases
            $table->unsignedBigInteger('patient_case_id')->index();

            $table->string('case_id', 64)->index();          // UUID / รหัสเคส
            $table->string('question', 100);                 // เช่น StrokeSuspect
            $table->string('question_key', 100);             // เช่น q6_uti
            $table->integer('question_code');                // โค้ดตัวเลข
            $table->string('question_title', 255);           // ข้อความเต็ม

            $table->json('clinic');                          // JSON array
            $table->json('symptoms')->nullable();
            $table->text('note')->nullable();

            $table->boolean('is_refer_case')->default(false);
            $table->string('type', 20)->default('form');     // 'form' หรือ 'guide'
            $table->string('routed_by', 100)->nullable();    // user id/name

            $table->timestamps();

            // ดัชนีเสริม
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
