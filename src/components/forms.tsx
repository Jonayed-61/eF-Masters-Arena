"use client";

import { useActionState, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import type { ActionState } from "@/app/actions";
import {
  adminEnterResultAction, adminRescheduleToReserveDayAction, applyPenaltyAction, changePasswordAction, createFixtureAction,
  adminCreatePlayerAction, adminResetPasswordAction, adminUpdatePlayerAction,
  createReserveDayAction, loginAction, requestReserveDayAction, respondToResultAction,
  respondReserveDayAction, reversePenaltyAction, reviewResultAction, submitResultAction,
  updateFixtureStatusAction, updateProfileAction, uploadAvatarAction,
  updateTournamentAction,
} from "@/app/actions";
import type { Fixture, Profile, ResultSubmission, ResultType, Tournament } from "@/lib/types";
import type { ReserveDayAvailability } from "@/lib/reserve-days";
import { Field, FormMessage } from "@/components/ui";
import { PlayerAvatar } from "@/components/player-avatar";
import { FIXTURE_STATUSES as ALL_FIXTURE_STATUSES, RESULT_TYPES, formatDate, labelize } from "@/lib/constants";

const initialState: ActionState = { ok: false, message: "" };
const FIXTURE_STATUSES = ALL_FIXTURE_STATUSES.filter((status) => !["RESULT_SUBMITTED", "PENDING_ADMIN_APPROVAL", "COMPLETED"].includes(status));

function Submit({ children, pendingLabel = "Saving...", className = "button button-primary", ...props }: { children: string; pendingLabel?: string } & Omit<ComponentProps<"button">, "children">) {
  const { pending } = useFormStatus();
  return <button {...props} className={className} type="submit" disabled={pending || props.disabled}>{pending ? pendingLabel : children}</button>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [visible, setVisible] = useState(false);
  return <form action={action} className="form-stack"><input type="hidden" name="next" value={next ?? ""} /><Field label="Email or username"><input name="identifier" autoComplete="username" required placeholder="you@example.com or username" /></Field><Field label="Password"><div className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff /> : <Eye />}</button></div></Field><FormMessage state={state} /><button className="button button-primary button-wide" disabled={pending} type="submit">{pending ? "Logging in..." : "Log in"}</button></form>;
}

export function ResultForm({ fixture, viewerId, admin = false }: { fixture: Fixture; viewerId?: string; admin?: boolean }) {
  const actionFunction = admin ? adminEnterResultAction : submitResultAction;
  const [state, action, pending] = useActionState(actionFunction, initialState);
  const ownSide = viewerId === fixture.away_player_id ? "AWAY" : "HOME";
  const [type, setType] = useState<ResultType>("NORMAL");
  const [awardSide, setAwardSide] = useState<"HOME" | "AWAY">(admin ? "HOME" : ownSide);
  const homeName = fixture.home_player?.username ?? "Home Player";
  const awayName = fixture.away_player?.username ?? "Away Player";
  const actualSide = type === "OPPONENT_LEFT" ? (admin ? awardSide : ownSide) : awardSide;
  return <form action={action} className="result-form"><input type="hidden" name="fixtureId" value={fixture.id} /><input type="hidden" name="resultType" value={type} /><div className="result-matchup"><div><span>Home</span><strong>{homeName}</strong></div><b>VS</b><div><span>Away</span><strong>{awayName}</strong></div></div><fieldset className="result-type-picker"><legend>Result type</legend>{RESULT_TYPES.map((item) => <button type="button" aria-pressed={type === item} className={type === item ? "active" : ""} key={item} onClick={() => { setType(item); if (!admin && item === "OPPONENT_LEFT") setAwardSide(ownSide); }}>{labelize(item)}</button>)}</fieldset>{type === "NORMAL" && <div className="score-input-grid"><Field label={`${homeName} goals`}><input name="homeActualGoals" type="number" min="0" max="99" defaultValue="0" required /></Field><Field label={`${awayName} goals`}><input name="awayActualGoals" type="number" min="0" max="99" defaultValue="0" required /></Field><input type="hidden" name="bonusSide" value="NONE" /></div>}{type !== "NORMAL" && <><div className="award-side-picker"><span>{type === "WALKOVER" ? "Walkover winner" : admin ? "Player who continued" : "Submitting Player"}</span>{admin || type === "WALKOVER" ? <div className="segmented"><button type="button" className={awardSide === "HOME" ? "active" : ""} onClick={() => setAwardSide("HOME")}>{homeName}</button><button type="button" className={awardSide === "AWAY" ? "active" : ""} onClick={() => setAwardSide("AWAY")}>{awayName}</button></div> : <strong>{ownSide === "HOME" ? homeName : awayName}</strong>}</div><input type="hidden" name="bonusSide" value={actualSide} />{type === "WALKOVER" ? <><input type="hidden" name="homeActualGoals" value="0" /><input type="hidden" name="awayActualGoals" value="0" /><div className="result-rule-note">Table result: {awardSide === "HOME" ? "3–0" : "0–3"}. Walkover goals do not count toward scorer statistics.</div></> : <div className="score-input-grid opponent-left-input">{actualSide === "HOME" ? <><Field label={`${homeName} actual goals`}><input name="homeActualGoals" type="number" min="0" max="99" defaultValue="0" required /></Field><input type="hidden" name="awayActualGoals" value="0" /><div className="locked-score"><span>{awayName}</span><strong>0</strong><small>Locked</small></div></> : <><input type="hidden" name="homeActualGoals" value="0" /><div className="locked-score"><span>{homeName}</span><strong>0</strong><small>Locked</small></div><Field label={`${awayName} actual goals`}><input name="awayActualGoals" type="number" min="0" max="99" defaultValue="0" required /></Field></>}</div>}</>}{admin && <div className="form-grid"><Field label="Administrative reason"><input name="reason" required placeholder="Reason for manual entry or correction" /></Field><Field label="Table destination"><select name="final" defaultValue="true"><option value="true">Approve as final</option><option value="false">Unofficial draft</option></select></Field></div>}<div className="form-footer"><FormMessage state={state} /><button className="button button-primary" disabled={pending} type="submit">{pending ? (admin ? "Saving..." : "Submitting...") : admin ? "Save Result" : "Submit Result"}</button></div></form>;
}

export function ResultResponseForm({ submissionId }: { submissionId: string }) {
  const [state, action] = useActionState(respondToResultAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="submissionId" value={submissionId} /><Submit className="button button-secondary" name="response" value="CONFIRMED" pendingLabel="Confirming...">Confirm Result</Submit><Submit className="button button-danger" name="response" value="DISPUTED" pendingLabel="Sending...">Dispute</Submit><FormMessage state={state} /></form>;
}

export function ReserveRequestForm({ fixtureId, reserveDays }: { fixtureId: string; reserveDays: Array<{ id: string; reserve_date: string; max_matches_per_player: number; available: boolean }> }) {
  const [state, action] = useActionState(requestReserveDayAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="fixtureId" value={fixtureId} /><select name="reserveDayId" required defaultValue=""><option value="" disabled>Select Reserve Day</option>{reserveDays.map((day) => <option key={day.id} value={day.id} disabled={!day.available}>{formatDate(day.reserve_date)} · {day.available ? `max ${day.max_matches_per_player}` : "capacity reached"}</option>)}</select><Submit pendingLabel="Requesting...">Request Reserve Day</Submit><FormMessage state={state} /></form>;
}

export function ReserveResponseForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(respondReserveDayAction, initialState);
  return <form action={action} className="inline-form"><input type="hidden" name="requestId" value={requestId} /><Submit name="response" value="ACCEPTED" pendingLabel="Accepting...">Accept</Submit><Submit className="button button-secondary" name="response" value="REJECTED" pendingLabel="Rejecting...">Reject</Submit><FormMessage state={state} /></form>;
}

export function ReviewResultForm({ submission }: { submission: ResultSubmission }) {
  const [state, action] = useActionState(reviewResultAction, initialState);
  return <form action={action} className="review-form"><input type="hidden" name="submissionId" value={submission.id} /><input name="reason" placeholder="Reason required when rejecting" /><Submit name="decision" value="APPROVE" pendingLabel="Approving...">Approve</Submit><Submit className="button button-danger" name="decision" value="REJECT" pendingLabel="Rejecting...">Reject</Submit><FormMessage state={state} /></form>;
}

export function FixtureForm({ tournament, players }: { tournament: Tournament; players: Profile[] }) {
  const [state, action] = useActionState(createFixtureAction, initialState);
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournament.id} /><Field label="Tournament"><input value={tournament.name} readOnly /></Field><Field label="Round"><input name="matchweek" type="number" min="1" required /></Field><Field label="Home player"><select name="homePlayerId" required defaultValue=""><option value="" disabled>Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></Field><Field label="Away player"><select name="awayPlayerId" required defaultValue=""><option value="" disabled>Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></Field><Field label="Date"><input name="matchDate" type="date" required /></Field><Field label="Status"><select name="status" defaultValue="SCHEDULED">{FIXTURE_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></Field><Field label="Notes (optional)"><textarea name="notes" rows={3} /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Create fixture</Submit></div></form>;
}

export function FixtureResolutionForm({ fixtureId }: { fixtureId: string }) {
  const [state, action] = useActionState(updateFixtureStatusAction, initialState);
  return <details className="fixture-actions"><summary>Fixture actions</summary><form action={action} className="review-form"><input type="hidden" name="fixtureId" value={fixtureId} /><select name="status"><option value="SCHEDULED">Edit scheduled date</option><option value="POSTPONED">Postpone</option><option value="RESCHEDULED">Reschedule</option><option value="CANCELLED">Cancel</option></select><input name="matchDate" type="date" aria-label="New date" /><input name="reason" required placeholder="Reason" /><Submit pendingLabel="Saving...">Save changes</Submit><FormMessage state={state} /></form></details>;
}

export function AdminReserveDayForm({ fixtureId, options, homeName = "Home Player", awayName = "Away Player" }: { fixtureId: string; options: ReserveDayAvailability[]; homeName?: string; awayName?: string }) {
  const [state, action, pending] = useActionState(adminRescheduleToReserveDayAction, initialState);
  const hasAvailableDay = options.some((option) => option.available);
  return <details className="fixture-actions reserve-day-actions"><summary>Move to Reserve Day</summary><form action={action} className="form-stack"><input type="hidden" name="fixtureId" value={fixtureId} /><div className="reserve-day-options">{options.map((option) => { const reason = option.unavailableReason?.replace("Home Player", homeName).replace("Away Player", awayName).replace("Both players", `${homeName} and ${awayName}`); return <label className={`reserve-day-option ${option.available ? "available" : "unavailable"}`} key={option.id}><input type="radio" name="reserveDayId" value={option.id} disabled={!option.available} required /><span><strong>{formatDate(option.reserve_date)}</strong><small>{homeName}: {option.homeMatchCount}/{option.max_matches_per_player} matches</small><small>{awayName}: {option.awayMatchCount}/{option.max_matches_per_player} matches</small><b>{option.available ? "Available" : "Unavailable"}</b>{reason && <small>{reason}</small>}</span></label>; })}</div><Field label="Administrative reason (optional)"><input name="reason" maxLength={500} placeholder="Why this fixture is being moved" /></Field><FormMessage state={state} /><button className="button button-primary" type="submit" disabled={pending || !hasAvailableDay}>{pending ? "Rescheduling..." : "Move to Reserve Day"}</button></form></details>;
}

export function ProfileForms({ profile }: { profile: Profile }) {
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, initialState);
  const [avatarState, avatarAction] = useActionState(uploadAvatarAction, initialState);
  return <><section className="panel profile-identity"><PlayerAvatar username={profile.username} src={profile.avatar_url} size="large" /><div><span>{profile.role}</span><h2>{profile.username}</h2><p>{profile.team_name || "No team name"}</p><small>{profile.email}</small></div></section><div className="two-column"><form action={profileAction} className="panel form-stack"><h2>Profile</h2><Field label="Username"><input name="username" defaultValue={profile.username} required /></Field><Field label="Team name"><input name="teamName" defaultValue={profile.team_name ?? ""} /></Field><Field label="External profile photo URL"><input name="avatarUrl" type="url" defaultValue={profile.avatar_url ?? ""} /></Field><Field label="Primary email" hint="Primary account email — cannot be changed."><input value={profile.email} readOnly /></Field><FormMessage state={profileState} /><Submit pendingLabel="Saving...">Save Changes</Submit></form><div className="form-stack"><form action={avatarAction} className="panel form-stack"><h2>Profile Photo</h2><Field label="Upload image" hint="JPG, PNG, or WebP. Maximum 2 MB."><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required /></Field><FormMessage state={avatarState} /><Submit pendingLabel="Uploading...">Upload Photo</Submit></form><form action={passwordAction} className="panel form-stack"><h2>Security</h2><Field label="New password" hint="At least 10 characters. Supabase may require a recent session."><input name="password" type="password" minLength={10} autoComplete="new-password" required /></Field><FormMessage state={passwordState} /><Submit pendingLabel="Updating...">Change Password</Submit></form></div></div></>;
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
  return <form action={action} className="form-grid"><input type="hidden" name="tournamentId" value={tournament.id} /><Field label="Name"><input name="name" defaultValue={tournament.name} required /></Field><Field label="Organizer"><input name="organizer" defaultValue={tournament.organizer} required /></Field><Field label="Status"><select name="status" defaultValue={tournament.status}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></Field><Field label="Current round"><input name="currentMatchweek" type="number" min="0" defaultValue={tournament.current_matchweek} required /></Field><Field label="Start date"><input name="startDate" type="date" defaultValue={tournament.start_date} required /></Field><Field label="End date"><input name="endDate" type="date" defaultValue={tournament.end_date ?? ""} /></Field><div className="form-footer"><FormMessage state={state} /><Submit>Save settings</Submit></div></form>;
}
