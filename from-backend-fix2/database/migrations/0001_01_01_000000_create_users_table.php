<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            // ใช้ InnoDB
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');

            // ---------------- ข้อมูลส่วนตัว ----------------
            $table->char('cid', 13)->unique()->comment('เลขบัตรประชาชน 13 หลัก');
            $table->string('first_name');
            $table->string('last_name');

            // ---------------- การใช้งานระบบ ----------------
            // บังคับอีเมล: NOT NULL + UNIQUE (ไม่มี default)
            $table->string('email')->unique();

            // MySQL 5.x: DATETIME default คงที่ (ไม่ใช่ฟังก์ชัน)
            $table->dateTime('email_verified_at')->default('1970-01-01 00:00:01');

            $table->string('password');

            // ---------------- สถานะ/สิทธิ์ ----------------
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->enum('role', ['user', 'admin'])->default('user')->index();

            // ---------------- เงื่อนไข re-apply ----------------
            $table->boolean('reapply_allowed')->default(false)->index();
            $table->date('reapply_until')->default('1970-01-01')->index();

            // ---------------- เวลาอนุมัติ/เหตุผลปฏิเสธ ----------------
            $table->dateTime('approved_at')->default('1970-01-01 00:00:01')->index();
            $table->string('rejected_reason', 255)->default('');

            // ---------------- Laravel remember token ----------------
            $table->string('remember_token', 100)->default('');

            // ---------------- Timestamps (เวอร์ชัน MySQL 5.5-safe) ----------------
            // ข้อจำกัด MySQL 5.5: ให้มีคอลัมน์ TIMESTAMP ที่ใช้ CURRENT_TIMESTAMP ได้ "แค่หนึ่งคอลัมน์"
            // เลือกให้ created_at ใช้ CURRENT_TIMESTAMP, ส่วน updated_at ใช้ค่า sentinel คงที่
            $table->timestamp('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('updated_at')->default('1970-01-01 00:00:01');

            // ---------------- ดัชนีเสริม ----------------
            $table->index(['status', 'created_at'], 'users_status_created_idx');
            $table->index('first_name');
            $table->index('last_name');
        });

        // หมายเหตุ: ไม่ใส่ CHECK constraint เพราะ MySQL 5.x จะละเลยหรือ error
        // ให้ validate CID/อีเมลใน Controller/Model แทน
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
