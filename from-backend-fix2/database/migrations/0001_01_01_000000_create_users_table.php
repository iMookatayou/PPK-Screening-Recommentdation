<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->bigIncrements('id');

            // ข้อมูลส่วนตัว
            $table->char('cid', 13)->unique()->comment('เลขบัตรประชาชน 13 หลัก');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('username')->unique()->index();   // ใช้ตัวนี้โชว์/อ้างอิงได้

            // การใช้งานระบบ
            $table->string('email')->unique();
            $table->dateTime('email_verified_at')->default('1970-01-01 00:00:01');
            $table->string('password');

            // สถานะ/สิทธิ์
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->enum('role', ['user', 'admin'])->default('user')->index();

            // เงื่อนไข re-apply
            $table->boolean('reapply_allowed')->default(false)->index();
            $table->date('reapply_until')->default('1970-01-01')->index();

            // อื่น ๆ
            $table->dateTime('approved_at')->default('1970-01-01 00:00:01')->index();
            $table->string('rejected_reason', 255)->default('');
            $table->dateTime('last_login_at')->default('1970-01-01 00:00:01')->index();

            $table->string('remember_token', 100)->default('');

            // Timestamps (MySQL 5.x safe)
            $table->timestamp('created_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('updated_at')->default('1970-01-01 00:00:01');

            // ดัชนีเสริม
            $table->index(['status', 'created_at'], 'users_status_created_idx');
            $table->index('first_name');
            $table->index('last_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
