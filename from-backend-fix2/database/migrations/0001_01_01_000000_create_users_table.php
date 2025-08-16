<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // ========== users ==========
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // ข้อมูลส่วนตัว
            $table->char('cid', 13)->unique()->comment('เลขบัตรประชาชน 13 หลัก');
            $table->string('first_name');
            $table->string('last_name');

            // สำหรับการใช้งานระบบ
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // สถานะการใช้งาน/สิทธิ์
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->enum('role', ['user', 'admin'])->default('user')->index();

            // การสมัครใหม่ (re-apply)
            $table->boolean('reapply_allowed')->default(false)->index();
            $table->date('reapply_until')->nullable()->index();

            // อนุมัติ/ปฏิเสธ
            $table->timestamp('approved_at')->nullable()->index();
            $table->string('rejected_reason', 255)->nullable();

            // Laravel features
            $table->rememberToken();
            $table->timestamps();
        });

        // CHECK สำหรับ CID (ข้ามถ้า DB ไม่รองรับ CHECK)
        try {
            DB::statement("ALTER TABLE `users`
                ADD CONSTRAINT `chk_users_cid`
                CHECK (`cid` REGEXP '^[0-9]{13}$')");
        } catch (\Throwable $e) {
            // noop
        }

        // ดัชนีเสริมเพื่อหน้าอนุมัติ/ค้นหาโหลดไวขึ้น
        Schema::table('users', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'users_status_created_idx');
            $table->index('cid');
            $table->index('first_name');
            $table->index('last_name');
            $table->index('email');
        });

        // ========== password_reset_tokens ==========
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email', 255)->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // ========== sessions ==========
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // ========== personal_access_tokens (Sanctum) ==========
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // ตารางที่อ้างอิง users ต้องถูกลบก่อน
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');

        // ลบดัชนีเสริมก่อน (กันบาง DB บ่น)
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'created_at')) {
                $table->dropIndex('users_status_created_idx');
            }
            // ดัชนีทั่วไป (Laravel จะตั้งชื่ออัตโนมัติ ถ้าลบไม่ได้จะไม่พัง)
            try { $table->dropIndex(['cid']); } catch (\Throwable $e) {}
            try { $table->dropIndex(['first_name']); } catch (\Throwable $e) {}
            try { $table->dropIndex(['last_name']); } catch (\Throwable $e) {}
            try { $table->dropIndex(['email']); } catch (\Throwable $e) {}
        });

        Schema::dropIfExists('users');
    }
};
