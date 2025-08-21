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

            // การใช้งานระบบ
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // สถานะ/สิทธิ์
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->enum('role', ['user', 'admin'])->default('user')->index();

            // เงื่อนไข re-apply
            $table->boolean('reapply_allowed')->default(false)->index();
            $table->date('reapply_until')->nullable()->index();

            // เวลาอนุมัติ/เหตุผลปฏิเสธ
            $table->timestamp('approved_at')->nullable()->index();
            $table->string('rejected_reason', 255)->nullable();

            // Laravel features
            $table->rememberToken();
            $table->timestamps();

            // ดัชนีเสริมสำหรับหน้าจัดการ
            $table->index(['status', 'created_at'], 'users_status_created_idx');
            $table->index('first_name');
            $table->index('last_name');
            // ไม่ต้องเพิ่ม index('email') ซ้ำ เพราะ unique() มี index อยู่แล้ว
            // ไม่ต้องเพิ่ม index('cid') ซ้ำ เพราะ unique('cid') มี index อยู่แล้ว
        });

        // CHECK สำหรับ CID (DB บางตัวไม่รองรับ ก็ try/catch ไป)
        try {
            DB::statement("ALTER TABLE `users`
                ADD CONSTRAINT `chk_users_cid`
                CHECK (`cid` REGEXP '^[0-9]{13}$')");
        } catch (\Throwable $e) {
            // ignore หาก DB ไม่รองรับ CHECK
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
