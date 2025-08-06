<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('referral_guidances', function (Blueprint $table) {
            $table->id();

            $table->string('question')->index();          // เช่น StrokeSuspect
            $table->integer('question_code');             // เช่น 25
            $table->string('question_title');             // ข้อความคำถามเต็ม

            $table->json('clinic');                       // หลายคลินิก เช่น ["er", "surgery"]
            $table->json('symptoms')->nullable();         // เช่น ["large_wound", "cellulitis"]
            $table->text('note')->nullable();             // หมายเหตุเพิ่มเติม
            $table->boolean('is_refer_case')->default(false); // กรณีต้องส่งต่อ
            $table->string('type')->default('guide');     // 'guide' สำหรับ referral เฉย ๆ

            $table->string('created_by');                 // เช่น nurse.aor
            $table->timestamps();                         // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_guidances');
    }
};
