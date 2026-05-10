import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListJobs, getListJobsQueryKey, 
  useCreateJob, useUpdateJob, useDeleteJob,
  Job
} from "@workspace/api-client-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const jobSchema = z.object({
  title: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  requirements: z.string().optional().or(z.literal("")),
  applicationUrl: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof jobSchema>;

export default function JobsManager() {
  const { data: jobs, isLoading } = useListJobs();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const deleteMutation = useDeleteJob();

  const form = useForm<FormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", company: "", location: "", type: "internship", description: "", requirements: "", applicationUrl: "", imageUrl: "", deadline: "" },
  });

  const handleOpenCreate = () => {
    setEditingJob(null);
    form.reset({ title: "", company: "", location: "", type: "internship", description: "", requirements: "", applicationUrl: "", imageUrl: "", deadline: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    form.reset({
      title: job.title, company: job.company, location: job.location, type: job.type,
      description: job.description, requirements: job.requirements || "", applicationUrl: job.applicationUrl || "",
      imageUrl: (job as any).imageUrl || "", deadline: job.deadline || ""
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          toast({ title: "Job updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          toast({ title: "Job listed" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        toast({ title: "Job deleted" });
        setItemToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Job Listings</h1>
          <p className="text-muted-foreground mt-1">Manage opportunities for students.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Post Job
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Role / Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : jobs?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No jobs found.</TableCell></TableRow>
            ) : (
              jobs?.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-muted-foreground">{job.company}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{job.type.replace("-", " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.location}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.deadline || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(job)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(job.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job" : "Post Job"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="part-time">Part Time</SelectItem>
                        <SelectItem value="full-time">Full Time</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="h-24" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="requirements" render={({ field }) => (
                <FormItem><FormLabel>Requirements (Optional)</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="applicationUrl" render={({ field }) => (
                  <FormItem><FormLabel>Application Link</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem><FormLabel>Deadline (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Job Image (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save Job</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)} onConfirm={handleDelete} isDeleting={deleteMutation.isPending} />
    </div>
  );
}
