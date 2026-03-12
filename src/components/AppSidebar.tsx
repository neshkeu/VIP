import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  CreditCard,
  Wrench,
  CarTaxiFront,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { title: "Kontrolna tabla", url: "/", icon: LayoutDashboard },
  { title: "Vozači", url: "/drivers", icon: Users },
  { title: "Vozila", url: "/vehicles", icon: Car },
  { title: "Zaduženja", url: "/rentals", icon: FileText },
  { title: "Uplate", url: "/payments", icon: CreditCard },
  { title: "Troškovi", url: "/expenses", icon: Wrench },
  { title: "POS Izvodi", url: "/pos-reports", icon: CarTaxiFront },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
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
        <div className="flex items-center justify-between">
          {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
