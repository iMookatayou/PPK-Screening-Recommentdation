<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key', 191)->primary();     // varchar(191)
            $table->mediumText('value');               // payload (ห้าม default บน MySQL)
            $table->integer('expiration')->default(0); // timestamp
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key', 191)->primary();      // varchar(191)
            $table->string('owner', 100)->default('');  // varchar(100)
            $table->integer('expiration')->default(0);  // timestamp
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};
