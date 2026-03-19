import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EventCard } from "@/components/shared/EventCard";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Events() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data: events, isLoading } = useListEvents();

  // Sort events: upcoming first, then past
  const sortedEvents = events?.sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-border pb-6">
          <SectionHeader title="Events Calendar" subtitle="Join the Community" />
          
          <div className="flex items-center gap-2 bg-secondary p-1">
            <Button 
              variant={view === "grid" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setView("grid")}
              className="rounded-none shadow-none"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Grid View
            </Button>
            <Button 
              variant={view === "list" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setView("list")}
              className="rounded-none shadow-none"
            >
              <List className="w-4 h-4 mr-2" />
              List View
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-96 bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className={`grid gap-8 ${view === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-4xl mx-auto"}`}>
            {sortedEvents?.map((event: any) => (
              <div key={event.id} className={view === "list" ? "flex flex-col sm:flex-row gap-6 border border-border p-4 bg-card" : ""}>
                {view === "list" ? (
                  <>
                    <div className="sm:w-1/3 aspect-video sm:aspect-auto sm:h-full bg-muted shrink-0">
                      {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-grow flex flex-col justify-center">
                      <div className="text-primary font-medium text-sm uppercase tracking-wider mb-2">{event.type}</div>
                      <h3 className="text-2xl font-display font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground mb-4">{event.date} • {event.time} • {event.location}</p>
                      <Button variant="outline" className="w-fit rounded-none">RSVP</Button>
                    </div>
                  </>
                ) : (
                  <EventCard event={event} />
                )}
              </div>
            ))}
            
            {(!sortedEvents || sortedEvents.length === 0) && (
              <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No events scheduled at the moment.</p>
                <p className="text-sm">Check back later for updates.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
