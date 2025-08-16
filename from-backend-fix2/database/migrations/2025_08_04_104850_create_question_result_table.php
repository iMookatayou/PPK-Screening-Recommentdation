<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('question_results', function (Blueprint $table) {
            $table->engine = 'InnoDB';

            $table->id();

            // สร้างคอลัมน์ FK แต่ยังไม่ constrain ตอนนี้
            $table->unsignedBigInteger('patient_case_id')->index();

            $table->string('case_id')->index();

            $table->string('question');
            $table->string('question_key');
            $table->integer('question_code');
            $table->string('question_title');

            $table->json('clinic');
            $table->json('symptoms')->nullable();
            $table->text('note')->nullable();

            $table->boolean('is_refer_case')->default(false);
            $table->string('type')->default('form');
            $table->string('routed_by')->nullable();

            $table->timestamps();

            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_results');
    }
};
