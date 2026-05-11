import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowRight, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { isStudentAuthenticated, getStudentPayload, removeStudentToken, getStudentToken } from "@/lib/student-auth";

const publicNavLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const memberNavLinks = [
  { label: "Resources", href: "/resources" },
  { label: "Groups", href: "/groups" },
];

function NavAvatar({ name, profilePicture }: { name: string; profilePicture?: string | null }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  if (profilePicture) {
    const src = `/api/storage/objects${profilePicture.replace(/^\/objects/, "")}`;
    return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover border-2 border-primary/30" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center border-2 border-primary/20">
      {initials}
    </div>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentLoggedIn, setStudentLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const authed = isStudentAuthenticated();
    setStudentLoggedIn(authed);
    if (authed) {
      const payload = getStudentPayload();
      setStudentName(payload ? `${payload.firstName} ${payload.lastName}` : "Student");
      // Fetch full profile to get picture
      const token = getStudentToken();
      fetch("/api/students/me/profile", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.profilePicture) setProfilePicture(data.profilePicture); })
        .catch(() => {});
    } else {
      setProfilePicture(null);
    }
  }, [location]);

  const handleStudentLogout = () => {
    removeStudentToken();
    setStudentLoggedIn(false);
    setProfilePicture(null);
    setLocation("/");
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/90 backdrop-blur-md border-b border-border/50 py-3 shadow-sm" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">

          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 z-50 relative">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="ARC Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="font-display font-bold text-sm tracking-tight group-hover:text-primary transition-colors duration-300">
              Architecture Student Association FBC
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            {[...publicNavLinks, ...(studentLoggedIn ? memberNavLinks : [])].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary relative py-1 ${
                  location === link.href ? "text-primary" : "text-foreground/80"
                }`}
              >
                {link.label}
                {location === link.href && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            {studentLoggedIn ? (
              <div className="relative flex items-center gap-2 ml-2">
                {/* Avatar button */}
                <button
                  onClick={() => setProfileMenuOpen(o => !o)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <NavAvatar name={studentName} profilePicture={profilePicture} />
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                    {studentName.split(" ")[0]}
                  </span>
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-card border border-border shadow-lg z-50"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold truncate">{studentName}</p>
                        <p className="text-xs text-muted-foreground">Student Account</p>
                      </div>
                      <Link href="/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                        <User className="w-4 h-4 text-muted-foreground" />
                        My Profile
                      </Link>
                      <button
                        onClick={handleStudentLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button variant="outline" className="rounded-none gap-2 ml-2" asChild>
                <Link href="/login">
                  <LogIn className="w-4 h-4" />
                  Student Login
                </Link>
              </Button>
            )}

            <Button className="rounded-none group" asChild>
              <Link href="/events">
                Join Us
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden z-50 p-2 text-foreground focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-0 pt-24 bg-background z-40 md:hidden flex flex-col px-6 pb-6 h-screen overflow-y-auto"
          >
            <div className="flex flex-col space-y-6 text-xl font-display font-medium">
              {[...publicNavLinks, ...(studentLoggedIn ? memberNavLinks : [])].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className={`block py-2 border-b border-border/50 ${
                      location === link.href ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-auto pt-8 flex flex-col gap-3"
            >
              {studentLoggedIn ? (
                <>
                  <Link href="/profile"
                    className="w-full border border-border py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                    <NavAvatar name={studentName} profilePicture={profilePicture} />
                    {studentName}
                  </Link>
                  <button
                    onClick={handleStudentLogout}
                    className="w-full border border-border py-3 text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:text-destructive hover:border-destructive/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Button variant="outline" className="w-full rounded-none py-6 text-base gap-2" asChild>
                  <Link href="/login">
                    <LogIn className="w-4 h-4" />
                    Student Login
                  </Link>
                </Button>
              )}
              <Button className="w-full rounded-none py-6 text-lg" size="lg" asChild>
                <Link href="/events">Become a Member</Link>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
