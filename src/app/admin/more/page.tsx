import { AdminMoreLinks } from "@/components/navigation";
import { PageHeader } from "@/components/ui";

export default function AdminMorePage() {
  return <><PageHeader eyebrow="Administration" title="More controls" description="Player access, profile security, tournament settings, and audit controls." /><AdminMoreLinks /></>;
}

