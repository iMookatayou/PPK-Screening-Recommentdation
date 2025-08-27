<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /** ห้ามจัดการตัวเอง */
    protected function isSelf(User $actor, User $target): bool
    {
        return (int)$actor->id === (int)$target->id;
    }

    /** ห้ามจัดการผู้ใช้ที่เป็น admin */
    protected function isAdmin(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function approve(User $actor, User $target): bool
    {
        if ($this->isSelf($actor, $target)) return false;
        if ($this->isAdmin($target)) return false;
        return true;
    }

    public function reject(User $actor, User $target): bool
    {
        if ($this->isSelf($actor, $target)) return false;
        if ($this->isAdmin($target)) return false;
        return true;
    }

    public function allowReapply(User $actor, User $target): bool
    {
        if ($this->isSelf($actor, $target)) return false;
        if ($this->isAdmin($target)) return false;
        return true;
    }

    public function blockReapply(User $actor, User $target): bool
    {
        if ($this->isSelf($actor, $target)) return false;
        if ($this->isAdmin($target)) return false;
        return true;
    }

    public function delete(User $actor, User $target): bool
    {
        if ($this->isSelf($actor, $target)) return false;
        if ($this->isAdmin($target)) return false;
        return true;
    }
}
