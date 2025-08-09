<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'cid'            => '1234567890123', // ใส่ให้ครบ 13 หลัก
                'first_name'     => 'System',
                'last_name'      => 'Admin',
                'password'       => Hash::make('Admin@12345'),
                'role'           => 'admin',
                'status'         => 'approved',
                'approved_at'    => now(),
                'rejected_reason'=> null,
            ]
        );
    }
}
