<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
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

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->enum('role', ['user', 'admin'])->default('user')->index();

            // อนุมัติ/ปฏิเสธ
            $table->timestamp('approved_at')->nullable()->index();
            $table->string('rejected_reason', 255)->nullable();

            // บันทึกการใช้งาน (ถ้าต้องการ ใช้ในอนาคต)
            // $table->timestamp('last_login_at')->nullable()->index();
            // $table->unsignedInteger('login_count')->default(0);

            // Laravel features
            $table->rememberToken();
            $table->timestamps();
            // $table->softDeletes(); // เปิดถ้าต้องการลบแบบ soft
        });

        try {
            DB::statement("ALTER TABLE `users` 
                ADD CONSTRAINT `chk_users_cid` 
                CHECK (`cid` REGEXP '^[0-9]{13}$')");
        } catch (\Throwable $e) {
            // ถ้าฐานไม่รองรับ CHECK ก็ข้ามได้ ไปบังคับใน validation ชั้นแอปแทน
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // ดัชนีเสริมเพื่อหน้าอนุมัติ/รายการผู้ใช้โหลดไวขึ้น
        Schema::table('users', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'users_status_created_idx');
        });
    }

    public function down(): void
    {
        // ลบดัชนีเสริมก่อน (กันบาง DB บ่น)
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_status_created_idx');
        });

        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
