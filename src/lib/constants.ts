import type { FixtureStatus, ResultType } from "@/lib/types";

export const APP_NAME = "eF Masters Arena";
export const CURRENT_TOURNAMENT_NAME = "eF Masters Pro League 0";
export const LOGO_PATH = "/eF%20masters%20logo.jpeg";

export const PLAYER_USERNAMES = [
  "JIHAN_FC7",
  "SATanbir1",
  "Hie_senberg",
  "feroz__2",
  "MAHI05",
  "Ontikboss",
  "kzkm234",
  "Ariyan10_Vk",
  "Tonmoy2022",
  "Rifat061",
  "Abir_Talukdar",
] as const;

export const FIXTURE_STATUSES: FixtureStatus[] = [
  "SCHEDULED",
  "RESULT_SUBMITTED",
  "PENDING_ADMIN_APPROVAL",
  "COMPLETED",
  "POSTPONED",
  "RESCHEDULED",
  "CANCELLED",
  "RESERVED",
];

export const RESULT_TYPES: ResultType[] = ["NORMAL", "WALKOVER", "OPPONENT_LEFT"];

export const formatDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
};

export const labelize = (value: string) =>
  value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
