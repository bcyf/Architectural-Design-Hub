import { Link } from "wouter";
import { ArrowRight, Instagram, Linkedin, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const subscribeMutation = useSubscribeNewsletter();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    subscribeMutation.mutate({ data: { email } }, {
      onSuccess: () => {
        toast({
          title: "Subscribed successfully!",
          description: "Welcome to the ARC newsletter.",
        });
        setEmail("");
      },
      onError: () => {
        toast({
          title: "Subscription failed",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <footer className="bg-foreground text-background pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex flex-col items-start gap-4">
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Architecture Students Association FBC Logo"
                className="h-28 w-auto object-contain bg-white p-2"
              />
              <span className="font-display font-bold text-lg tracking-tight">
                ARC Association
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Fostering a community of design excellence, critical thinking, and architectural innovation for students.
            </p>
            <div className="flex space-x-4">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary hover:border-primary transition-colors">
                <Instagram size={18} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary hover:border-primary transition-colors">
                <Linkedin size={18} />
              </a>
              <a href="mailto:contact@arc-student.org" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-primary hover:border-primary transition-colors">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-medium text-lg mb-6 uppercase tracking-wider text-white/90">Navigation</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors inline-block hover:translate-x-1 transform duration-200">About Us</Link></li>
              <li><Link href="/events" className="hover:text-primary transition-colors inline-block hover:translate-x-1 transform duration-200">Events & RSVP</Link></li>
              <li><Link href="/resources" className="hover:text-primary transition-colors inline-block hover:translate-x-1 transform duration-200">Student Resources</Link></li>
              <li><Link href="/gallery" className="hover:text-primary transition-colors inline-block hover:translate-x-1 transform duration-200">Project Gallery</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors inline-block hover:translate-x-1 transform duration-200">The Drafting Board</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-medium text-lg mb-6 uppercase tracking-wider text-white/90">Contact</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <span>Architecture Building, Room 402<br/>University Campus</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary shrink-0" />
                <span>info@arc-student.org</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-medium text-lg mb-6 uppercase tracking-wider text-white/90">The Blueprint</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to our newsletter for weekly studio tips, upcoming critiques, and exclusive job postings.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-12 rounded-none focus-visible:ring-primary focus-visible:border-primary"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  type="submit" 
                  disabled={subscribeMutation.isPending}
                  className="absolute right-0 top-0 h-full text-white hover:bg-primary hover:text-white rounded-none"
                >
                  <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Architecture Student Association FBC. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
