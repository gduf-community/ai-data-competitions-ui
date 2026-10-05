import type { UserRole } from "@/lib/types";

import { NewNavbar } from "@/components/marketing/new-navbar";

interface PortalCurrentUser {
  name: string;
  role: UserRole;
}

interface PortalNavbarProps {
  currentUser?: PortalCurrentUser | null;
}

export function PortalNavbar({ currentUser }: PortalNavbarProps) {
  return (
    <>
      <NewNavbar currentUser={currentUser} />
      <div aria-hidden="true" className="h-24" />
    </>
  );
}
