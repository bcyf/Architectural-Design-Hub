import { Event } from "@workspace/api-client-react";
import { format } from "date-fns";
import { MapPin, Clock, Calendar, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: Event;
}

const typeColors: Record<string, string> = {
  workshop: "bg-blue-100 text-blue-800 border-blue-200",
  lecture: "bg-purple-100 text-purple-800 border-purple-200",
  social: "bg-orange-100 text-orange-800 border-orange-200",
  critique: "bg-red-100 text-red-800 border-red-200",
  competition: "bg-green-100 text-green-800 border-green-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
};

export function EventCard({ event }: EventCardProps) {
  const dateObj = new Date(event.date);
  const colorClass = typeColors[event.type] || typeColors.other;

  return (
    <Card className="rounded-none border-border hover:border-foreground/30 transition-all duration-300 h-full flex flex-col group overflow-hidden bg-background hover:shadow-xl hover:-translate-y-1">
      {event.imageUrl ? (
        <div className="aspect-[16/9] overflow-hidden relative">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-4 left-4">
            <Badge className={`rounded-none font-medium uppercase tracking-wide text-xs ${colorClass}`}>
              {event.type}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="h-2 w-full bg-primary" />
      )}
      
      <CardContent className="p-6 flex-grow flex flex-col">
        {!event.imageUrl && (
          <Badge className={`rounded-none font-medium uppercase tracking-wide w-fit text-xs mb-4 ${colorClass}`}>
            {event.type}
          </Badge>
        )}
        
        <h3 className="text-xl font-display font-bold mb-3 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        
        <div className="space-y-2 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{format(dateObj, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{event.location}</span>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-grow">
          {event.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-1 text-xs font-medium text-foreground/70">
            <Users size={14} />
            <span>{event.rsvpCount} Attending</span>
          </div>
          <Button variant="outline" className="rounded-none border-foreground hover:bg-foreground hover:text-background" size="sm">
            RSVP Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
