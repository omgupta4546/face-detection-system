import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, BookOpen, BarChart3, Bell, Settings, LogOut,
  Camera, Building2, GraduationCap, Menu, X, ChevronDown, UserCircle,
  Calendar, FileText, Search, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const roleNavItems: Record<string, NavItem[]> = {
  student: [
    { title: "Dashboard", href: "/student", icon: LayoutDashboard },
    { title: "Classroom", href: "/student/classroom", icon: BookOpen },
    { title: "Attendance", href: "/student/attendance", icon: Calendar },
    { title: "Courses", href: "/student/courses", icon: FileText },
    { title: "Notifications", href: "/student/notifications", icon: Bell },
  ],
  professor: [
    { title: "Dashboard", href: "/professor", icon: LayoutDashboard },
    { title: "Classroom", href: "/professor/classroom", icon: BookOpen },
    { title: "Attendance", href: "/professor/attendance", icon: Camera },
    { title: "Reports", href: "/professor/reports", icon: FileText },
    { title: "Analytics", href: "/professor/analytics", icon: BarChart3 },
    { title: "Alerts", href: "/professor/notifications", icon: Bell },
  ],
  admin: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Departments", href: "/admin/departments", icon: Building2 },
    { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
  "super-admin": [
    { title: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { title: "Institutions", href: "/super-admin/institutions", icon: Building2 },
    { title: "Users", href: "/super-admin/users", icon: Users },
    { title: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    { title: "Settings", href: "/super-admin/settings", icon: Settings },
  ],
};

const roleLabels: Record<string, string> = {
  student: "Student",
  professor: "Professor",
  admin: "College Admin",
  "super-admin": "Super Admin",
};

const roleGradients: Record<string, string> = {
  student: "gradient-student",
  professor: "gradient-professor",
  admin: "gradient-admin",
  "super-admin": "gradient-info",
};

const roleBadgeColors: Record<string, string> = {
  student: "bg-primary/15 text-primary border-primary/20",
  professor: "bg-accent/15 text-accent border-accent/20",
  admin: "bg-warning/15 text-warning border-warning/20",
  "super-admin": "bg-info/15 text-info border-info/20",
};

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
}

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout, api } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch real unread notification count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        const unread = res.data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        // Silently fail — notifications are non-critical
      }
    };
    fetchUnread();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [api]);

  // Build nav items with real badge count for notification/alerts links
  const navItems = (roleNavItems[role] || []).map(item => {
    if (item.title === 'Notifications' || item.title === 'Alerts') {
      return { ...item, badge: unreadCount > 0 ? unreadCount : undefined };
    }
    return item;
  });

  // Use real user data, with fallback
  const displayName = authUser?.name || "User";
  const displayEmail = authUser?.email || "";
  const displayAvatar = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const bottomNavItems = navItems.slice(0, 5);
  const gradient = roleGradients[role] || "gradient-primary";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col gradient-sidebar transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${gradient} shadow-lg shadow-primary/20`}>
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-primary-foreground tracking-tight">SmartClass</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground hover:text-primary-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-5 pb-2">
          <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${roleBadgeColors[role]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {roleLabels[role]}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-sidebar-accent text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-primary-foreground"
                  }`}
              >
                <item.icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-sidebar-primary" : ""}`} />
                <span>{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Help */}
        <div className="px-3 pb-2">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all">
            <HelpCircle className="h-[18px] w-[18px]" />
            <span>Help & Support</span>
          </button>
        </div>

        {/* User */}
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sidebar-accent/50 transition-all">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${gradient} text-xs font-bold text-primary-foreground shadow-sm`}>
                  {displayAvatar}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-primary-foreground text-sm truncate">{displayName}</p>
                  <p className="text-[11px] text-sidebar-foreground truncate">{displayEmail}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem className="rounded-lg"><UserCircle className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/${role}/settings`)} className="rounded-lg cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-destructive rounded-lg cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border glass-strong px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students, classes, reports..."
              className="h-9 pl-9 rounded-xl bg-secondary/60 border-0 text-sm focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5 ml-auto">
            <Link to={`/${role}/notifications`}>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl">
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <div className={`lg:hidden flex h-8 w-8 items-center justify-center rounded-xl ${gradient} text-[10px] font-bold text-primary-foreground`}>
              {displayAvatar}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border glass-strong px-2 pb-safe lg:hidden">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                <span>{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-0.5 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
