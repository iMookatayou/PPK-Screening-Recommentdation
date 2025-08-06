<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('patient_cases', function (Blueprint $table) {
            $table->id();

            $table->string('case_id')->unique()->index(); // รหัสอ้างอิงของเคส
            $table->string('cid')->index();               // เลขบัตรประชาชน
            $table->string('name');
            $table->integer('age');
            $table->string('gender');

            $table->string('maininscl_name')->nullable(); // สิทธิการรักษา
            $table->string('hmain_name')->nullable();     // โรงพยาบาลหลัก

            $table->json('summary_clinics')->nullable();  // คลินิกทั้งหมดที่แนะนำ
            $table->json('symptoms')->nullable();      // อาการรวมทั้งหมด

            $table->timestamps(); // created_at / updated_at
        });
    }

    public function down()
    {
        Schema::dropIfExists('patient_cases');
    }
};

