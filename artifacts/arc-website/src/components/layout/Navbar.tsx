import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowRight, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { isStudentAuthenticated, getStudentPayload, removeStudentToken } from "@/lib/student-auth";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Resources", href: "/resources" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentLoggedIn, setStudentLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const authed = isStudentAuthenticated();
    setStudentLoggedIn(authed);
    if (authed) {
      const payload = getStudentPayload();
      setStudentName(payload?.firstName || "Student");
    }
  }, [location]);

  const handleStudentLogout = () => {
    removeStudentToken();
    setStudentLoggedIn(false);
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
            {navLinks.map((link) => (
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
              <div className="flex items-center gap-3 ml-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{studentName}</span>
                </div>
                <button
                  onClick={handleStudentLogout}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors border border-border px-3 py-1.5 hover:border-destructive/50"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
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
              {navLinks.map((link, i) => (
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
                <button
                  onClick={handleStudentLogout}
                  className="w-full border border-border py-3 text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:text-destructive hover:border-destructive/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out ({studentName})
                </button>
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
