import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function SiteHeader() {
  const { user } = useCurrentUserState();
  return (
    <header className="top">
      <div className="top-inner">
        <Link to="/" className="brand">
          <span className="product">
            The Lab<span className="stop">.</span>
          </span>
          <span className="track">Twelve Leads</span>
        </Link>
        {user ? <UserButton /> : null}
      </div>
    </header>
  );
}
