<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Admin คนแรก: Admin System
        User::updateOrCreate(
            ['email' => 'ppkhosp.go.th+sys@gmail.com'],
            [
                'cid'               => '0000000000000', // 13 หลัก
                'first_name'        => 'Admin',
                'last_name'         => 'System',
                'password'          => bcrypt('admin11331134'),
                'status'            => 'approved',
                'role'              => 'admin',
                'reapply_allowed'   => false,
                'reapply_until'     => null,
                'approved_at'       => now(),
                'email_verified_at' => now(),
                'remember_token'    => Str::random(60),
            ]
        );

        // Admin คนที่สอง: Admin
        User::updateOrCreate(
            ['email' => 'ppkhosp.go.th+admin@gmail.com'],
            [
                'cid'               => '0393196660000', // 13 หลัก
                'first_name'        => 'User Client Admin',
                'last_name'         => '-',           
                'password'          => bcrypt('user039319111'),
                'status'            => 'approved',
                'role'              => 'admin',
                'reapply_allowed'   => false,
                'reapply_until'     => null,
                'approved_at'       => now(),
                'email_verified_at' => now(),
                'remember_token'    => Str::random(60),
            ]
        );
    }
}
