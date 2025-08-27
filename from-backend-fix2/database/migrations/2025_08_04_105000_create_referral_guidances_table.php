<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('referral_guidances', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');

            // เมตา
            $table->string('question', 100)->index();                 // เช่น StrokeSuspect
            $table->unsignedSmallInteger('question_code')->index();   // เร็วและพอ 0–65535
            $table->string('question_title', 255);

            // ผลลัพธ์
            $table->json('clinic');                                   // ต้องส่ง JSON valid เสมอ เช่น ["er"]
            $table->json('symptoms');                                 // MySQL 5.x: ห้าม DEFAULT → ใส่ในแอปตอน insert

            // หมายเหตุ: ใช้ VARCHAR เพื่อให้ตั้ง default '' ได้ (TEXT บางเวอร์ชันห้าม default)
            $table->string('note', 500)->default('');

            $table->boolean('is_refer_case')->default(false);
            $table->string('type', 20)->default('guide');             // 'guide' | 'referral'

            $table->string('created_by', 100)->default('');           // เช่น nurse.aor
            $table->timestamps();

            // ดัชนีสรุป
            $table->index(['type', 'created_at']);
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_guidances');
    }
};
