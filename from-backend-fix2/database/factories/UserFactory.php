<?php

// database/factories/UserFactory.php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'cid'        => $this->faker->unique()->numerify('#############'), // 13 หลัก
            'first_name' => $this->faker->firstName(),
            'last_name'  => $this->faker->lastName(),
            'email'      => $this->faker->unique()->safeEmail(),
            'password'   => Hash::make('Password123'),
            'status'     => 'approved',
            'role'       => 'user',
        ];
    }

    public function admin(): static
    {
        return $this->state(fn () => [
            'role'   => 'admin',
            'status' => 'approved',
        ]);
    }
}
