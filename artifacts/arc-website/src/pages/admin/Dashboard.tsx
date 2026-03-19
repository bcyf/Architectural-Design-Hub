import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, FileText, Image as ImageIcon, 
  Users, Folder, Briefcase, Mail, Activity
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const cards = [
    { title: "Total Events", value: stats?.totalEvents || 0, icon: Calendar, color: "text-blue-500" },
    { title: "Upcoming Events", value: stats?.upcomingEvents || 0, icon: Activity, color: "text-green-500" },
    { title: "Blog Posts", value: stats?.totalNews || 0, icon: FileText, color: "text-orange-500" },
    { title: "Gallery Images", value: stats?.totalGallery || 0, icon: ImageIcon, color: "text-purple-500" },
    { title: "Team Members", value: stats?.totalTeamMembers || 0, icon: Users, color: "text-pink-500" },
    { title: "Resources", value: stats?.totalResources || 0, icon: Folder, color: "text-cyan-500" },
    { title: "Job Listings", value: stats?.totalJobs || 0, icon: Briefcase, color: "text-indigo-500" },
    { title: "Contact Submissions", value: stats?.totalContacts || 0, icon: Mail, color: "text-rose-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome to the FBC Admin Panel. Here's a summary of your content.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="border-border shadow-sm hover-elevate overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-border" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold">
                  {isLoading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
