import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListTeamMembers, getListTeamMembersQueryKey, 
  useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember,
  TeamMember
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/hooks/use-toast";

const teamSchema = z.object({
  name: z.string().min(1, "Required"),
  position: z.string().min(1, "Required"),
  year: z.string().min(1, "Required"),
  bio: z.string().min(1, "Required"),
  interests: z.string().min(1, "Required"),
  imageUrl: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  linkedin: z.string().optional().or(z.literal("")),
  order: z.coerce.number().default(0),
  isPreviousExec: z.boolean().default(false),
  academicYear: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof teamSchema>;

const DEFAULT_FORM: FormValues = {
  name: "", position: "", year: "", bio: "", interests: "",
  imageUrl: "", email: "", instagram: "", linkedin: "",
  order: 0, isPreviousExec: false, academicYear: "",
};

export default function TeamManager() {
  const { data: team, isLoading } = useListTeamMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  const form = useForm<FormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: DEFAULT_FORM,
  });

  const watchIsPrevious = form.watch("isPreviousExec");

  const handleOpenCreate = () => {
    setEditingMember(null);
    form.reset(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      position: member.position,
      year: member.year,
      bio: member.bio,
      interests: member.interests,
      imageUrl: member.imageUrl || "",
      email: member.email || "",
      instagram: member.instagram || "",
      linkedin: member.linkedin || "",
      order: member.order,
      isPreviousExec: member.isPreviousExec ?? false,
      academicYear: member.academicYear || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Member updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Member added" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
        toast({ title: "Member deleted" });
        setItemToDelete(null);
      }
    });
  };

  const currentMembers = team?.filter(m => !m.isPreviousExec).sort((a, b) => a.order - b.order) ?? [];
  const previousMembers = team?.filter(m => m.isPreviousExec).sort((a, b) => {
    if (a.academicYear && b.academicYear) return b.academicYear.localeCompare(a.academicYear);
    return a.order - b.order;
  }) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage the association executive team.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {/* Current Executives */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Current Executive Board</h2>
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Member Info</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : currentMembers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No current members. Add one above.</TableCell></TableRow>
              ) : (
                currentMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-muted-foreground">{member.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.imageUrl ? (
                          <img src={member.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-muted" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email || "No email"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.position}</TableCell>
                    <TableCell>{member.year}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(member.id)}>
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
      </div>

      {/* Previous Executives */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Previous Executives</h2>
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Member Info</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : previousMembers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No previous executives yet.</TableCell></TableRow>
              ) : (
                previousMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-muted-foreground">{member.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.imageUrl ? (
                          <img src={member.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-muted" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email || "No email"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.position}</TableCell>
                    <TableCell>
                      {member.academicYear ? (
                        <Badge variant="outline">{member.academicYear}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(member.id)}>
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
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Previous Executive toggle */}
              <FormField control={form.control} name="isPreviousExec" render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border border-border p-3 bg-muted/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer font-medium">Previous Executive</FormLabel>
                    <p className="text-xs text-muted-foreground">Check this if the member served in a past term.</p>
                  </div>
                </FormItem>
              )} />

              {/* Academic Year — only visible for previous execs */}
              {watchIsPrevious && (
                <FormField control={form.control} name="academicYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year (e.g., 2023–2024)</FormLabel>
                    <FormControl><Input placeholder="2023–2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="position" render={({ field }) => (
                  <FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Year (e.g., 3rd Year)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="order" render={({ field }) => (
                  <FormItem><FormLabel>Display Order (lower is first)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="interests" render={({ field }) => (
                <FormItem><FormLabel>Interests</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Photo (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader value={field.value || ""} onChange={field.onChange} variant="avatar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem><FormLabel>Instagram Handle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="linkedin" render={({ field }) => (
                  <FormItem><FormLabel>LinkedIn Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)} onConfirm={handleDelete} isDeleting={deleteMutation.isPending} />
    </div>
  );
}
