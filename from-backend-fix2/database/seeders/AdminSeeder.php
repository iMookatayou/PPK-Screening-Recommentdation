<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $epochDate = '1970-01-01';

        // Admin System
        User::updateOrCreate(
            ['email' => 'ppkhosp.go.th+sys@gmail.com'],
            [
                'username'          => 'sysadmin',           // << เพิ่ม
                'cid'               => '0000000000000',
                'first_name'        => 'Admin',
                'last_name'         => 'System',
                'password'          => Hash::make('admin11331134'),
                'status'            => 'approved',
                'role'              => 'admin',
                'reapply_allowed'   => false,
                'reapply_until'     => $epochDate,
                'approved_at'       => now(),
                'email_verified_at' => now(),
                'remember_token'    => Str::random(60),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        // Client Admin
        User::updateOrCreate(
            ['email' => 'ppkhosp.go.th+admin@gmail.com'],
            [
                'username'          => 'clientadmin',        // << เพิ่ม
                'cid'               => '0393196660000',
                'first_name'        => 'User Client Admin',
                'last_name'         => '-',
                'password'          => Hash::make('user039319111'),
                'status'            => 'approved',
                'role'              => 'admin',
                'reapply_allowed'   => false,
                'reapply_until'     => $epochDate,
                'approved_at'       => now(),
                'email_verified_at' => now(),
                'remember_token'    => Str::random(60),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );
    }
}
