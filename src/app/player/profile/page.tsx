import { requireViewer } from "@/lib/auth";
import { ProfileForms } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function PlayerProfilePage() {
  const viewer = await requireViewer("PLAYER");
  return <><PageHeader eyebrow="Account" title="Profile & security" description="Changes propagate by player ID to fixtures, results, tables, leaderboards, and H2H history." /><ProfileForms profile={viewer.profile} /></>;
}

