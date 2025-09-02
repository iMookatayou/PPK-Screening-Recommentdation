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
            $table->string('question', 100)->index();               // เช่น StrokeSuspect
            $table->unsignedSmallInteger('question_code')->index(); // 0–65535
            $table->string('question_title', 255);

            // ผลลัพธ์ (JSON)
            $table->json('clinic');     // เช่น ["er"]
            $table->json('symptoms');   // เช่น []

            // ข้อความเพิ่มเติม
            $table->string('note', 500)->default('');

            $table->boolean('is_refer_case')->default(false);
            $table->string('type', 20)->default('guide');           // 'guide' | 'referral'

            // ผู้สร้าง (FK → users.id) ตั้งชื่อ FK เองกันชน
            $table->unsignedBigInteger('created_by')->nullable();
            $table->index('created_by', 'ref_guid_created_by_idx');

            $table->timestamps();

            // ดัชนีสรุป
            $table->index(['type', 'created_at'], 'ref_guid_type_created_idx');

            // FK ชื่อชัดเจน
            $table->foreign('created_by', 'ref_guid_created_by_fk')
                  ->references('id')->on('users')
                  ->onUpdate('cascade')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_guidances');
    }
};
