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

// Student Auth Pages
import StudentLogin from "@/pages/StudentLogin";
import StudentSignup from "@/pages/StudentSignup";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";

// Admin Pages
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/components/layout/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminEvents from "@/pages/admin/EventsManager";
import AdminBlog from "@/pages/admin/BlogManager";
import AdminGallery from "@/pages/admin/GalleryManager";
import AdminTeam from "@/pages/admin/TeamManager";
import AdminResources from "@/pages/admin/ResourcesManager";
import AdminJobs from "@/pages/admin/JobsManager";
import AdminContacts from "@/pages/admin/ContactsManager";
import AdminSettings from "@/pages/admin/Settings";
import AdminNewsletter from "@/pages/admin/NewsletterManager";
import AdminQuotes from "@/pages/admin/QuotesManager";
import AdminFaq from "@/pages/admin/FaqManager";
import FAQ from "@/pages/FAQ";
import BlogPost from "@/pages/BlogPost";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function StudentPage({ children }: { children: React.ReactNode }) {
  return (
    <StudentProtectedRoute>
      {children}
    </StudentProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      {/* Student Auth */}
      <Route path="/login" component={StudentLogin} />
      <Route path="/signup" component={StudentSignup} />

      {/* Admin Login */}
      <Route path="/admin/login" component={AdminLogin} />

      {/* Protected Admin Routes */}
      <Route path="/admin" component={() => <AdminPage><AdminDashboard /></AdminPage>} />
      <Route path="/admin/events" component={() => <AdminPage><AdminEvents /></AdminPage>} />
      <Route path="/admin/blog" component={() => <AdminPage><AdminBlog /></AdminPage>} />
      <Route path="/admin/gallery" component={() => <AdminPage><AdminGallery /></AdminPage>} />
      <Route path="/admin/team" component={() => <AdminPage><AdminTeam /></AdminPage>} />
      <Route path="/admin/resources" component={() => <AdminPage><AdminResources /></AdminPage>} />
      <Route path="/admin/jobs" component={() => <AdminPage><AdminJobs /></AdminPage>} />
      <Route path="/admin/contacts" component={() => <AdminPage><AdminContacts /></AdminPage>} />
      <Route path="/admin/settings" component={() => <AdminPage><AdminSettings /></AdminPage>} />
      <Route path="/admin/newsletter" component={() => <AdminPage><AdminNewsletter /></AdminPage>} />
      <Route path="/admin/quotes" component={() => <AdminPage><AdminQuotes /></AdminPage>} />
      <Route path="/admin/faq" component={() => <AdminPage><AdminFaq /></AdminPage>} />

      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/events" component={Events} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogPost} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Student-protected Routes */}
      <Route path="/resources" component={() => <StudentPage><Resources /></StudentPage>} />
      <Route path="/gallery" component={() => <StudentPage><Gallery /></StudentPage>} />

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
