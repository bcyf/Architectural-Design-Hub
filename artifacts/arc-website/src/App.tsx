import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Public Pages
import Home from "@/pages/Home";
import About from "@/pages/About";
import Events from "@/pages/Events";
import Resources from "@/pages/Resources";
import Gallery from "@/pages/Gallery";
import Blog from "@/pages/Blog";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/not-found";

// Admin Pages
import AdminLayout from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminEvents from "@/pages/admin/EventsManager";
import AdminBlog from "@/pages/admin/BlogManager";
import AdminGallery from "@/pages/admin/GalleryManager";
import AdminTeam from "@/pages/admin/TeamManager";
import AdminResources from "@/pages/admin/ResourcesManager";
import AdminJobs from "@/pages/admin/JobsManager";
import AdminContacts from "@/pages/admin/ContactsManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin" component={() => <AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/events" component={() => <AdminLayout><AdminEvents /></AdminLayout>} />
      <Route path="/admin/blog" component={() => <AdminLayout><AdminBlog /></AdminLayout>} />
      <Route path="/admin/gallery" component={() => <AdminLayout><AdminGallery /></AdminLayout>} />
      <Route path="/admin/team" component={() => <AdminLayout><AdminTeam /></AdminLayout>} />
      <Route path="/admin/resources" component={() => <AdminLayout><AdminResources /></AdminLayout>} />
      <Route path="/admin/jobs" component={() => <AdminLayout><AdminJobs /></AdminLayout>} />
      <Route path="/admin/contacts" component={() => <AdminLayout><AdminContacts /></AdminLayout>} />

      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/events" component={Events} />
      <Route path="/resources" component={Resources} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/blog" component={Blog} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
