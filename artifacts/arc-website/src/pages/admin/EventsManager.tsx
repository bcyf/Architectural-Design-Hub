import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListEvents, getListEventsQueryKey, 
  useCreateEvent, useUpdateEvent, useDeleteEvent,
  useListEventRsvps,
  Event
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Plus, Edit, Trash2, Calendar, MapPin, Users, Mail } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  type: z.string().min(1, "Type is required"),
  imageUrl: z.string().optional().or(z.literal("")),
  isUpcoming: z.boolean().default(true),
  rsvpCount: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof eventSchema>;

function RsvpListDialog({ event, onClose }: { event: Event | null; onClose: () => void }) {
  const { data: rsvps, isLoading } = useListEventRsvps(event?.id ?? 0, {
    query: { enabled: !!event },
  });

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            RSVPs — {event?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm text-muted-foreground pb-2 border-b border-border">
          <span className="flex items-center gap-1.5"><Calendar size={14} /> {event?.date}</span>
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {event?.location}</span>
          <span className="flex items-center gap-1.5 ml-auto font-semibold text-foreground">
            <Users size={14} className="text-primary" />
            {rsvps?.length ?? event?.rsvpCount ?? 0} registered
          </span>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          ) : !rsvps?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No RSVPs yet for this event.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rsvps.map((rsvp, i) => (
                  <TableRow key={rsvp.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium">{rsvp.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${rsvp.email}`} className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                        <Mail size={13} /> {rsvp.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(rsvp.createdAt), "MMM d, yyyy · h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-3 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsManager() {
  const { data: events, isLoading } = useListEvents();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [rsvpViewEvent, setRsvpViewEvent] = useState<Event | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "", description: "", date: "", time: "", location: "", type: "other", imageUrl: "", isUpcoming: true, rsvpCount: 0
    },
  });

  const handleOpenCreate = () => {
    setEditingEvent(null);
    form.reset({ title: "", description: "", date: "", time: "", location: "", type: "other", imageUrl: "", isUpcoming: true, rsvpCount: 0 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      type: event.type,
      imageUrl: event.imageUrl || "",
      isUpcoming: event.isUpcoming,
      rsvpCount: event.rsvpCount,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingEvent) {
      updateMutation.mutate(
        { id: editingEvent.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            toast({ title: "Event updated successfully" });
            setIsDialogOpen(false);
          },
          onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            toast({ title: "Event created successfully" });
            setIsDialogOpen(false);
          },
          onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate(
      { id: itemToDelete },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast({ title: "Event deleted successfully" });
          setItemToDelete(null);
        },
        onError: () => toast({ title: "Failed to delete event", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Events Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage upcoming activities.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Event Info</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>RSVPs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : events?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No events found.</TableCell></TableRow>
            ) : (
              events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.title}</div>
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase">{event.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {event.date}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{event.time}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{event.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.isUpcoming ? (
                      <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">Upcoming</Badge>
                    ) : (
                      <Badge variant="secondary">Past</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-sm font-semibold hover:text-primary"
                      onClick={() => setRsvpViewEvent(event)}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {event.rsvpCount}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(event)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Event title" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem><FormLabel>Time</FormLabel><FormControl><Input placeholder="e.g. 6:00 PM" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Where is it?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="lecture">Lecture</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="critique">Critique</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Image (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isUpcoming" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is Upcoming?</FormLabel>
                    <p className="text-[10px] text-muted-foreground">Show in upcoming events list</p>
                  </div>
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* RSVP list dialog */}
      <RsvpListDialog event={rsvpViewEvent} onClose={() => setRsvpViewEvent(null)} />

      <DeleteConfirmDialog 
        open={!!itemToDelete} 
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
