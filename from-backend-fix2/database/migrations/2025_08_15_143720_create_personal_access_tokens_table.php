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
            $table->id();

            // แทนที่ morphs() เพื่อกำหนดความยาวชัดเจน + ทำ composite index เอง
            $table->string('tokenable_type', 191);
            $table->unsignedBigInteger('tokenable_id');
            $table->index(['tokenable_type', 'tokenable_id'], 'pat_tokenable_idx');

            $table->string('name', 150);              // ชื่อโทเคน (พอสำหรับ UI)
            $table->string('token', 64)->unique();    // ฮาช 64 ตัว
            $table->text('abilities')->nullable();    // สิทธิ์ (json-encoded text)
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
