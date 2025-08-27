<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            return; // มีแล้ว ไม่ต้องสร้างซ้ำ
        }

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');

            // เหมือน morphs() แต่กำหนดเอง เพื่อควบคุมความยาว index (ปลอดภัยกับ utf8mb4)
            $table->string('tokenable_type', 191);
            $table->unsignedBigInteger('tokenable_id');
            $table->index(['tokenable_type', 'tokenable_id'], 'pat_tokenable_idx');

            $table->string('name', 150);
            $table->string('token', 64)->unique();      // Sanctum เก็บ hash ยาว 64
            $table->text('abilities')->nullable();      // ตามสเปก Sanctum

            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();

            // timestamps() ของ Laravel จะเป็น nullable ตามค่าเริ่มต้น (เข้ากับ Sanctum)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
