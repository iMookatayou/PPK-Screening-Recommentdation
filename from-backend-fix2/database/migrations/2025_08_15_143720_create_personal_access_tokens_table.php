<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            return;
        }

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->bigIncrements('id');

            // ใช้ morphs() แบบกำหนดความยาว index เอง เพื่อให้เข้ากับ utf8mb4
            $table->string('tokenable_type', 191);
            $table->unsignedBigInteger('tokenable_id');
            $table->index(['tokenable_type', 'tokenable_id'], 'pat_tokenable_idx');

            $table->string('name', 150);
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();

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
