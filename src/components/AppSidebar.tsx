import { LayoutDashboard, Users, Car, CalendarDays, Banknote, LogOut, AlertCircle, Smartphone, CreditCard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { title: "Kontrolna tabla", url: "/",         icon: LayoutDashboard },
  { title: "Vozila",          url: "/vehicles",  icon: Car             },
  { title: "Vozači",          url: "/drivers",   icon: Users           },
  { title: "Kalendar",        url: "/calendar",  icon: CalendarDays    },
  { title: "Kasa",            url: "/cash",      icon: Banknote        },
  { title: "Dugovanja",       url: "/debts",     icon: AlertCircle     },
  { title: "Yandex",          url: "/yandex",    icon: Smartphone      },
  { title: "Kartice",         url: "/cards",     icon: CreditCard      },
];

export function AppSidebar() {
  const { state }       = useSidebar();
  const collapsed       = state === "collapsed";
  const location        = useLocation();
  const { displayName, logout } = useCurrentUser();
  const currentPath     = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <img src="/vip-taxi-logo.png" alt="VIP Taxi Logo" className="h-10 w-10 object-cover rounded-xl" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-display font-bold text-sidebar-foreground tracking-wide">VIP TAXI</h2>
              <p className="text-xs text-muted-foreground">Upravljanje voznim parkom</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigacija</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && <span className="text-xs text-muted-foreground truncate">{displayName}</span>}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={logout}
              className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
