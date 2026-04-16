import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { EventCard } from "@/components/shared/EventCard";
import { RsvpModal } from "@/components/shared/RsvpModal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListEvents, useListNews, useListQuotes, Event } from "@workspace/api-client-react";

// Mock data fallbacks to ensure beautiful UI even if API returns empty
const MOCK_EVENTS = [
  {
    id: 1, title: "Final Studio Critique", description: "Join us for the final presentation of 3rd year studio projects. Guest critics from leading local firms.", date: "2025-05-15", time: "14:00 - 18:00", location: "Main Gallery", type: "critique", imageUrl: "https://images.unsplash.com/photo-1527694224012-6a58d4380eb9?w=800&q=80", isUpcoming: true, rsvpCount: 45, createdAt: new Date().toISOString()
  },
  {
    id: 2, title: "Rhino to Revit Pipeline Workshop", description: "A technical deep dive into workflow optimization for large scale models.", date: "2025-05-20", time: "18:00 - 20:00", location: "Computer Lab 2", type: "workshop", imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80", isUpcoming: true, rsvpCount: 22, createdAt: new Date().toISOString()
  },
  {
    id: 3, title: "Alumni Mixer & Portfolio Review", description: "Connect with recent graduates and get constructive feedback on your portfolio.", date: "2025-05-25", time: "19:00 - 21:00", location: "Student Lounge", type: "social", imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80", isUpcoming: true, rsvpCount: 60, createdAt: new Date().toISOString()
  }
];

const FALLBACK_QUOTE = {
  text: "Architecture should speak of its time and place, but yearn for timelessness.",
  author: "Frank Gehry",
};

export default function Home() {
  const { data: eventsData, isLoading: eventsLoading } = useListEvents({ upcoming: true, limit: 3 });
  const { data: newsData, isLoading: newsLoading } = useListNews({ limit: 3 });
  const { data: quotes } = useListQuotes();
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);

  const activeQuote = quotes?.find(q => q.isActive) ?? (quotes?.length ? quotes[0] : null);
  
  const events = eventsData?.length ? eventsData : MOCK_EVENTS;
  
  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const nextEventDate = events?.[0]?.date ? new Date(events[0].date).getTime() : new Date().getTime() + 864000000;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = nextEventDate - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [nextEventDate]);

  return (
    <PageWrapper>
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] w-full flex items-center bg-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.jpg`} 
            alt="Architecture Student Association FBC" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 to-background/20" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground font-medium text-sm mb-6 uppercase tracking-widest">
              <span>Est. 2022</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-tight mb-6 text-foreground">
              Designing <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">Tomorrow.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              We are the Architecture Student Association FBC. Fostering a community of design excellence, critical thinking, and architectural innovation for students.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="rounded-none text-base px-8 py-6" asChild>
                <Link href="/events">
                  Explore Upcoming Events
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-none text-base px-8 py-6 border-2" asChild>
                <Link href="/gallery">View Student Portfolio</Link>
              </Button>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce text-muted-foreground">
          <span className="text-xs uppercase tracking-widest mb-2 font-medium">Scroll</span>
          <div className="w-[1px] h-12 bg-primary"></div>
        </div>
      </section>

      {/* Countdown Section */}
      <section className="bg-primary text-primary-foreground py-12 border-b-4 border-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="font-display text-2xl font-bold mb-2">Next Major Event</h3>
              <p className="text-primary-foreground/80">{events?.[0]?.title || "Annual Spring Showcase"}</p>
            </div>
            
            <div className="flex gap-4 sm:gap-8">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Seconds', value: timeLeft.seconds }
              ].map((unit, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-4xl md:text-5xl font-display font-bold tabular-nums">
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <span className="text-xs uppercase tracking-widest opacity-80 mt-1">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <SectionHeader title="Upcoming Events" subtitle="Get Involved" />
            <Button variant="ghost" className="hidden sm:flex group" asChild>
              <Link href="/events">
                View Calendar
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventsLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-[450px] bg-muted animate-pulse" />)
            ) : (
              events?.map((event: any, i: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <EventCard event={event} onRsvp={(e) => setRsvpEvent(e as Event)} />
                </motion.div>
              ))
            )}
          </div>
          
          <Button variant="outline" className="w-full mt-8 sm:hidden rounded-none" asChild>
            <Link href="/events">View All Events</Link>
          </Button>
        </div>
      </section>

      {/* Quote Banner */}
      <section className="py-32 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-drafting-grid pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="text-6xl text-primary font-display leading-none block mb-4">"</span>
          <blockquote className="text-2xl md:text-4xl font-display font-medium leading-tight mb-8">
            {activeQuote?.text ?? FALLBACK_QUOTE.text}
          </blockquote>
          <cite className="text-muted-foreground uppercase tracking-widest font-medium">
            — {activeQuote?.author ?? FALLBACK_QUOTE.author}
          </cite>
        </div>
      </section>

      {/* News Preview Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="The Drafting Board" subtitle="Latest Insights" centered />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
            {/* Featured Post (First one) */}
            <div className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden bg-muted mb-6">
                {/* landing page architectural structure */}
                <img 
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80" 
                  alt="Featured architectural news" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-primary mb-3">
                <span>Alumni Spotlight</span>
                <span className="w-1 h-1 bg-border rounded-full" />
                <span>5 Min Read</span>
              </div>
              <h3 className="text-3xl font-display font-bold mb-4 group-hover:text-primary transition-colors">
                Redefining Urban Spaces: An Interview with Sarah Chen
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We sat down with ARC alumni Sarah Chen ('19) to discuss her recent award-winning sustainable housing project in downtown Seattle and how her studio experience shaped her approach.
              </p>
              <div className="flex items-center text-sm font-medium">
                Read Article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            
            {/* List of other posts */}
            <div className="flex flex-col justify-center space-y-8">
              {[
                { title: "Top 5 Render Plugins for 2025", category: "Tech Tips", date: "May 10", excerpt: "Boost your workflow with these essential rendering tools tested by our studio peers." },
                { title: "Opinion: The End of Parametricism?", category: "Opinion", date: "May 05", excerpt: "Are we moving towards a more restrained, material-focused architectural language?" },
                { title: "Recap: Spring Architecture Gala", category: "News", date: "April 28", excerpt: "Highlights from our biggest networking event of the semester." }
              ].map((post, i) => (
                <div key={i} className="group cursor-pointer border-b border-border/50 pb-8 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                    <span className="text-primary">{post.category}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span>{post.date}</span>
                  </div>
                  <h4 className="text-xl font-display font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              ))}
              
              <Button variant="outline" className="w-fit rounded-none mt-4" asChild>
                <Link href="/blog">View All Articles</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <RsvpModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />
    </PageWrapper>
  );
}
