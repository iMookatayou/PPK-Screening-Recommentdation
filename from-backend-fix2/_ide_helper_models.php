<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property string $name_th
 * @property string $name_en
 * @property string $icd_10
 * @property string $category
 * @property int $alert
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereAlert($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereIcd10($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereNameEn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereNameTh($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Disease whereUpdatedAt($value)
 */
	class Disease extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $case_id
 * @property string $cid
 * @property string $name
 * @property int $age
 * @property string $gender
 * @property string $maininscl_name
 * @property string $hmain_name
 * @property array<array-key, mixed> $summary_clinics
 * @property array<array-key, mixed> $symptoms
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QuestionResult> $questionResults
 * @property-read int|null $question_results_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QuestionResult> $questionResultsByCaseId
 * @property-read int|null $question_results_by_case_id_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereAge($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereCaseId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereCid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereGender($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereHmainName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereMaininsclName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereSummaryClinics($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereSymptoms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PatientCase whereUpdatedAt($value)
 */
	class PatientCase extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $patient_case_id
 * @property string $case_id
 * @property string $question
 * @property string $question_key
 * @property int $question_code
 * @property string $question_title
 * @property array $clinic
 * @property array $symptoms
 * @property string $note
 * @property bool $is_refer_case
 * @property string $type
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\PatientCase $patientCase
 * @property-read \App\Models\PatientCase|null $patientCaseByCode
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereCaseId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereClinic($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereIsReferCase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult wherePatientCaseId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereQuestion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereQuestionCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereQuestionKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereQuestionTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereSymptoms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QuestionResult whereUpdatedAt($value)
 */
	class QuestionResult extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $question
 * @property int $question_code
 * @property string $question_title
 * @property array<array-key, mixed> $clinic
 * @property array<array-key, mixed> $symptoms
 * @property string $note
 * @property bool $is_refer_case
 * @property string $type
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereClinic($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereIsReferCase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereQuestion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereQuestionCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereQuestionTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereSymptoms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ReferralGuidance whereUpdatedAt($value)
 */
	class ReferralGuidance extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $cid เลขบัตรประชาชน 13 หลัก
 * @property string $first_name
 * @property string $last_name
 * @property string $username
 * @property string $email
 * @property \Illuminate\Support\Carbon $email_verified_at
 * @property string $password
 * @property string $status
 * @property string $role
 * @property bool $reapply_allowed
 * @property \Illuminate\Support\Carbon $reapply_until
 * @property \Illuminate\Support\Carbon $approved_at
 * @property string $rejected_reason
 * @property \Illuminate\Support\Carbon $last_login_at
 * @property string $remember_token
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read bool $can_reapply
 * @property-read string $full_name
 * @property-read bool $is_approved
 * @property-read string $name
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User approved()
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User pending()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User rejected()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User search(?string $term)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereFirstName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLastLoginAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLastName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLogin(string $login)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereReapplyAllowed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereReapplyUntil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRejectedReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUsername($value)
 */
	class User extends \Eloquent {}
}

