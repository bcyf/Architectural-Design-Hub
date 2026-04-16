import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EventCard } from "@/components/shared/EventCard";
import { RsvpModal } from "@/components/shared/RsvpModal";
import { useListEvents, Event } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, List, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Events() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const { data: events, isLoading } = useListEvents();

  const sortedEvents = events?.slice().sort((a: any, b: any) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
                    <div className="flex-grow flex flex-col justify-center gap-3">
                      <div className="text-primary font-medium text-sm uppercase tracking-wider">{event.type}</div>
                      <h3 className="text-2xl font-display font-bold">{event.title}</h3>
                      <p className="text-muted-foreground">{event.date} • {event.time} • {event.location}</p>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          className="w-fit rounded-none"
                          onClick={() => setRsvpEvent(event)}
                        >
                          RSVP
                        </Button>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users size={13} /> {event.rsvpCount} attending
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <EventCard event={event} onRsvp={setRsvpEvent} />
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

      <RsvpModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />
    </PageWrapper>
  );
}
