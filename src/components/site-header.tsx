import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { HardHat, LayoutDashboard, LogOut, Menu, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/bookings", label: "My bookings" },
  { to: "/worker", label: "Worker app", icon: HardHat },
  { to: "/admin", label: "Federation dashboard", icon: LayoutDashboard },
];

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Users className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold tracking-tight">
              CO-OP CONNECT
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Cooperative gig services
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:block">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border bg-card px-4 py-2 md:hidden", open ? "block" : "hidden")}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
