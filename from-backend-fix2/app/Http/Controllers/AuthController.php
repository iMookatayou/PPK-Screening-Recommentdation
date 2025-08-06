<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * ลงทะเบียนผู้ใช้ใหม่
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'in:admin,user'
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => $request->role ?? 'user'
        ]);

        // สร้าง token ใหม่แบบมีวันหมดอายุ (สิ้นวัน)
        $tokenResult = $user->createToken('auth_token', ['*'], now()->endOfDay());

        return response()->json([
            'user'  => $user->only(['id', 'name', 'email', 'role']),
            'access_token' => $tokenResult->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $tokenResult->accessToken->expires_at,
        ]);
    }

    /**
     * Login ผู้ใช้
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // ลบ token เก่าก่อน (จำกัด 1 user = 1 token)
        $user->tokens()->where('name', 'auth_token')->delete();

        // สร้าง token ใหม่หมดอายุภายในวัน
        $tokenResult = $user->createToken('auth_token', ['*'], now()->endOfDay());

        return response()->json([
            'user'  => $user->only(['id', 'name', 'email', 'role']),
            'access_token' => $tokenResult->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $tokenResult->accessToken->expires_at,
        ]);
    }

    /**
     * ข้อมูลผู้ใช้ที่ login อยู่
     */
    public function me(Request $request)
    {
        return response()->json($request->user()->only(['id', 'name', 'email', 'role']));
    }

    /**
     * Logout = ลบทุก token
     */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
