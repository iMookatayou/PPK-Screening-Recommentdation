<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
       Schema::create('referral_guidances', function (Blueprint $table) {
            $table->id();

            $table->string('question')->index();       // เช่น StrokeSuspect
            $table->integer('question_code')->index(); // +index เพื่อสรุปเร็ว
            $table->string('question_title');          // 255 ตัวอักษรพอ

            $table->json('clinic');                    // ["er","surgery"]
            $table->json('symptoms')->nullable();
            $table->text('note')->nullable();
            $table->boolean('is_refer_case')->default(false);
            $table->string('type')->default('guide');  // 'guide' หรือ 'referral'

            $table->string('created_by');              // เช่น nurse.aor
            $table->timestamps();

            // ดัชนีเสริมเพื่อการสรุป
            $table->index(['type', 'created_at']);
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_guidances');
    }
};
