"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ActionState } from "@/app/actions";
import {
  adminEnterResultAction, applyPenaltyAction, changePasswordAction, createFixtureAction,
  adminCreatePlayerAction, adminResetPasswordAction, adminUpdatePlayerAction,
  createReserveDayAction, loginAction, requestReserveDayAction, respondToResultAction,
  respondReserveDayAction, reversePenaltyAction, reviewResultAction, submitResultAction,
  updateFixtureStatusAction, updateProfileAction, uploadAvatarAction,
  updateTournamentAction,
} from "@/app/actions";
import type { Fixture, Profile, ResultSubmission, Tournament } from "@/lib/types";
import { Field, FormMessage } from "@/components/ui";
import { FIXTURE_STATUSES as ALL_FIXTURE_STATUSES, RESULT_TYPES, labelize } from "@/lib/constants";

const initialState: ActionState = { ok: false, message: "" };
const FIXTURE_STATUSES = ALL_FIXTURE_STATUSES.filter((status) => !["RESULT_SUBMITTED", "PENDING_ADMIN_APPROVAL", "COMPLETED"].includes(status));

function Submit({ children }: { children: string }) {
  return <button className="button button-primary" type="submit">{children}</button>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [visible, setVisible] = useState(false);
  return <form action={action} className="form-stack"><input type="hidden" name="next" value={next ?? ""} /><Field label="Email or username"><input name="identifier" autoComplete="username" required placeholder="you@example.com or username" /></Field><Field label="Password"><div className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff /> : <Eye />}</button></div></Field><FormMessage state={state} /><button className="button button-primary button-wide" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button></form>;
}

export function ResultForm({ fixture, admin = false }: { fixture: Fixture; admin?: boolean }) {
  const actionFunction = admin ? adminEnterResultAction : submitResultAction;
  const [state, action, pending] = useActionState(actionFunction, initialState);
  const [type, setType] = useState("NORMAL");
  return <form action={action} className="form-grid"><input type="hidden" name="fixtureId" value={fixture.id} /><Field label="Result type"><select name="resultType" value={type} onChange={(event) => setType(event.target.value)}>{RESULT_TYPES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field><Field label={`${fixture.home_player?.username ?? "Home"} actual goals`}><input name="homeActualGoals" type="number" min="0" max="99" defaultValue="0" readOnly={type === "WALKOVER"} required /></Field><Field label={`${fixture.away_player?.username ?? "Away"} actual goals`}><input name="awayActualGoals" type="number" min="0" max="99" defaultValue="0" readOnly={type === "WALKOVER"} required /></Field><Field label="Administrative +3"><select name="bonusSide" defaultValue="NONE" required><option value="NONE">None</option><option value="HOME">Home player</option><option value="AWAY">Away player</option></select></Field>{admin && <><Field label="Administrative reason"><input name="reason" required placeholder="Reason for manual entry or correction" /></Field><Field label="Table destination"><select name="final" defaultValue="true"><option value="true">Approve as final</option><option value="false">Unofficial draft</option></select></Field></>}<div className="form-footer"><FormMessage state={state} /><button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : admin ? "Save result" : "Submit result"}</button></div></form>;
}

export function ResultResponseForm({ submissionId }: { submissionId: string }) {
  const [state, action] = useActionState(respondToResultAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="submissionId" value={submissionId} /><button className="button button-secondary" name="response" value="CONFIRMED">Confirm</button><button className="button button-danger" name="response" value="DISPUTED">Dispute</button><FormMessage state={state} /></form>;
}

export function ReserveRequestForm({ fixtureId, reserveDays }: { fixtureId: string; reserveDays: Array<{ id: string; reserve_date: string; max_matches_per_player: number; available: boolean }> }) {
  const [state, action] = useActionState(requestReserveDayAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="fixtureId" value={fixtureId} /><select name="reserveDayId" required defaultValue=""><option value="" disabled>Select Reserve Day</option>{reserveDays.map((day) => <option key={day.id} value={day.id} disabled={!day.available}>{day.reserve_date} · {day.available ? `max ${day.max_matches_per_player}` : "capacity reached"}</option>)}</select><Submit>Request move</Submit><FormMessage state={state} /></form>;
}

export function ReserveResponseForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(respondReserveDayAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="requestId" value={requestId} /><button className="button button-primary" name="response" value="ACCEPTED">Accept</button><button className="button button-secondary" name="response" value="REJECTED">Reject</button><FormMessage state={state} /></form>;
}

export function ReviewResultForm({ submission }: { submission: ResultSubmission }) {
  const [state, action] = useActionState(reviewResultAction, initialState);
  return <form action={action} className="review-form"><input type="hidden" name="submissionId" value={submission.id} /><input name="reason" placeholder="Reason required when rejecting" /><button className="button button-primary" name="decision" value="APPROVE">Approve</button><button className="button button-danger" name="decision" value="REJECT">Reject</button><FormMessage state={state} /></form>;
}

export function FixtureForm({ tournament, players }: { tournament: Tournament; players: Profile[] }) {
  const [state, action] = useActionState(createFixtureAction, initialState);
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournament.id} /><Field label="Tournament"><input value={tournament.name} readOnly /></Field><Field label="Matchweek"><input name="matchweek" type="number" min="1" required /></Field><Field label="Home player"><select name="homePlayerId" required defaultValue=""><option value="" disabled>Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></Field><Field label="Away player"><select name="awayPlayerId" required defaultValue=""><option value="" disabled>Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></Field><Field label="Date"><input name="matchDate" type="date" required /></Field><Field label="Status"><select name="status" defaultValue="SCHEDULED">{FIXTURE_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></Field><Field label="Notes (optional)"><textarea name="notes" rows={3} /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Create fixture</Submit></div></form>;
}

export function FixtureResolutionForm({ fixtureId }: { fixtureId: string }) {
  const [state, action] = useActionState(updateFixtureStatusAction, initialState);
  return <form action={action} className="review-form"><input type="hidden" name="fixtureId" value={fixtureId} /><select name="status"><option value="POSTPONED">Postpone</option><option value="RESCHEDULED">Reschedule</option><option value="RESERVED">Move to reserve workflow</option><option value="CANCELLED">Cancel</option></select><input name="matchDate" type="date" aria-label="New date" /><input name="reason" required placeholder="Reason" /><Submit>Update</Submit><FormMessage state={state} /></form>;
}

export function ProfileForms({ profile }: { profile: Profile }) {
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, initialState);
  const [avatarState, avatarAction] = useActionState(uploadAvatarAction, initialState);
  return <div className="two-column"><form action={profileAction} className="panel form-stack"><h2>Profile</h2><Field label="Username"><input name="username" defaultValue={profile.username} required /></Field><Field label="Team name"><input name="teamName" defaultValue={profile.team_name ?? ""} /></Field><Field label="External profile photo URL"><input name="avatarUrl" type="url" defaultValue={profile.avatar_url ?? ""} /></Field><Field label="Primary email" hint="Primary account email — cannot be changed."><input value={profile.email} readOnly /></Field><FormMessage state={profileState} /><Submit>Save profile</Submit></form><div className="form-stack"><form action={avatarAction} className="panel form-stack"><h2>Profile photo</h2><Field label="Upload image" hint="JPG, PNG, or WebP. Maximum 2 MB."><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required /></Field><FormMessage state={avatarState} /><Submit>Upload photo</Submit></form><form action={passwordAction} className="panel form-stack"><h2>Security</h2><Field label="New password" hint="At least 10 characters. Supabase may require a recent session."><input name="password" type="password" minLength={10} autoComplete="new-password" required /></Field><FormMessage state={passwordState} /><Submit>Change password</Submit></form></div></div>;
}

export function ReserveDayForm({ tournamentId }: { tournamentId: string }) {
  const [state, action] = useActionState(createReserveDayAction, initialState);
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournamentId} /><Field label="Reserve date"><input name="reserveDate" type="date" required /></Field><Field label="Max matches per player"><input name="maxMatches" type="number" min="1" defaultValue="2" required /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Add Reserve Day</Submit></div></form>;
}

export function PenaltyForm({ tournamentId, players }: { tournamentId: string; players: Profile[] }) {
  const [state, action] = useActionState(applyPenaltyAction, initialState);
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournamentId} /><Field label="Player"><select name="playerId" required defaultValue=""><option disabled value="">Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></Field><Field label="Points adjustment"><input name="adjustment" type="number" defaultValue="-3" min="-99" max="99" required /></Field><Field label="Reason"><input name="reason" required /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Apply adjustment</Submit></div></form>;
}

export function ReversePenaltyForm({ penaltyId }: { penaltyId: string }) {
  const [state, action] = useActionState(reversePenaltyAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="penaltyId" value={penaltyId} /><input name="reason" required placeholder="Reversal reason" /><Submit>Reverse</Submit><FormMessage state={state} /></form>;
}

export function PlayerCreateForm({ tournamentId }: { tournamentId?: string }) {
  const [state, action] = useActionState(adminCreatePlayerAction, initialState);
  return <form action={action} className="form-grid">{tournamentId && <input type="hidden" name="tournamentId" value={tournamentId} />}<Field label="Primary email"><input name="email" type="email" required /></Field><Field label="Username"><input name="username" pattern="[A-Za-z0-9_]+" required /></Field><Field label="Team name (optional)"><input name="teamName" /></Field><Field label="Temporary password" hint="At least 10 characters; send it securely."><input name="password" type="password" minLength={10} required /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Create player</Submit></div></form>;
}

export function PlayerEditForm({ player }: { player: Profile }) {
  const [editState, editAction] = useActionState(adminUpdatePlayerAction, initialState);
  const [passwordState, passwordAction] = useActionState(adminResetPasswordAction, initialState);
  return <details className="result-card"><summary><strong>{player.username}</strong> · {player.status}</summary><form action={editAction} className="form-grid"><input type="hidden" name="playerId" value={player.id} /><Field label="Username"><input name="username" defaultValue={player.username} required /></Field><Field label="Team name"><input name="teamName" defaultValue={player.team_name ?? ""} /></Field><Field label="Login access"><select name="status" defaultValue={player.status}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field><div className="form-footer"><FormMessage state={editState} /><Submit>Save player</Submit></div></form><form action={passwordAction} className="form-grid"><input type="hidden" name="playerId" value={player.id} /><Field label="New temporary password"><input name="password" type="password" minLength={10} required /></Field><Field label="Reset reason"><input name="reason" required /></Field><div className="form-footer"><FormMessage state={passwordState} /><Submit>Reset password</Submit></div></form></details>;
}

export function TournamentSettingsForm({ tournament }: { tournament: Tournament }) {
  const [state, action] = useActionState(updateTournamentAction, initialState);
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournament.id} /><Field label="Name"><input name="name" defaultValue={tournament.name} required /></Field><Field label="Organizer"><input name="organizer" defaultValue={tournament.organizer} required /></Field><Field label="Status"><select name="status" defaultValue={tournament.status}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></Field><Field label="Current matchweek"><input name="currentMatchweek" type="number" min="0" defaultValue={tournament.current_matchweek} required /></Field><Field label="Start date"><input name="startDate" type="date" defaultValue={tournament.start_date} required /></Field><Field label="End date"><input name="endDate" type="date" defaultValue={tournament.end_date ?? ""} /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Save settings</Submit></div></form>;
}
