import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Calendar, FileText, Image as ImageIcon, 
  Users, Folder, Briefcase, Mail, LogOut, Hexagon
} from "lucide-react";
import { removeToken } from "@/lib/auth";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/blog", label: "Blog & News", icon: FileText },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/resources", label: "Resources", icon: Folder },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/contacts", label: "Contacts", icon: Mail },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  function handleLogout() {
    removeToken();
    setLocation("/admin/login");
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 text-zinc-300 flex flex-col shrink-0 transition-all border-r border-zinc-900">
        <div className="h-16 flex items-center px-6 border-b border-zinc-900">
          <Link href="/admin" className="flex items-center gap-3 text-white hover:text-primary transition-colors">
            <Hexagon className="w-6 h-6 text-primary fill-primary/20" />
            <span className="font-display font-bold text-lg tracking-tight">FBC Admin</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <p className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Management
          </p>
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-70"}`} />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-900 space-y-1">
          <Link 
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            Back to Public Site
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
