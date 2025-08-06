<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_results', function (Blueprint $table) {
            $table->id();

            $table->string('case_id')->index();          // FK เชื่อมกับ patient_cases
            $table->string('question');                  // โค้ดคำถาม เช่น StrokeSuspect
            $table->integer('question_code');            // เช่น 25
            $table->string('question_title');            // ข้อความคำถามเต็ม

            $table->json('clinic');                      // หลายคลินิก เช่น ["er", "surgery"]
            $table->json('symptoms')->nullable();       
            $table->text('note')->nullable();            // หมายเหตุเพิ่มเติม
            $table->boolean('is_refer_case')->default(false); // ส่งต่อหรือไม่
            $table->string('type')->default('form');

            $table->timestamps();

            // ถ้าคุณต้องการ enforce FK:
            // $table->foreign('case_id')->references('case_id')->on('patient_cases')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
