import { requireViewer } from "@/lib/auth";
import { ProfileForms } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function AdminProfilePage() {
  const viewer = await requireViewer("ADMIN");
  return <><PageHeader eyebrow="Account" title="Admin profile & security" description="Primary email is immutable from the application." /><ProfileForms profile={viewer.profile} /></>;
}
