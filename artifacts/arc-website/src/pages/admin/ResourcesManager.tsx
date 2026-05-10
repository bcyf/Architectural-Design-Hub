import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListResources, getListResourcesQueryKey, 
  useCreateResource, useUpdateResource, useDeleteResource,
  Resource
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { FileUploader } from "@/components/admin/FileUploader";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const resourceSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  fileUrl: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  software: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof resourceSchema>;

export default function ResourcesManager() {
  const { data: resources, isLoading } = useListResources();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  const form = useForm<FormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { title: "", description: "", type: "guide", fileUrl: "", imageUrl: "", software: "" },
  });

  const handleOpenCreate = () => {
    setEditingResource(null);
    form.reset({ title: "", description: "", type: "guide", fileUrl: "", imageUrl: "", software: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (resource: Resource) => {
    setEditingResource(resource);
    form.reset({
      title: resource.title, description: resource.description, type: resource.type,
      fileUrl: resource.fileUrl || "", imageUrl: (resource as any).imageUrl || "", software: resource.software || ""
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
          toast({ title: "Resource updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
          toast({ title: "Resource created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
        toast({ title: "Resource deleted" });
        setItemToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Resources Management</h1>
          <p className="text-muted-foreground mt-1">Manage academic toolkits and guides.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Resource
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Software</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : resources?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No resources found.</TableCell></TableRow>
            ) : (
              resources?.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">
                    {resource.title}
                    <div className="text-xs font-normal text-muted-foreground truncate max-w-md mt-1">{resource.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{resource.type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{resource.software || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(resource)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(resource.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="book">Book / PDF</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                        <SelectItem value="software">Software Link</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="software" render={({ field }) => (
                  <FormItem><FormLabel>Software (Optional)</FormLabel><FormControl><Input placeholder="e.g. Revit" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="fileUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload File or Paste URL</FormLabel>
                  <FormControl>
                    <FileUploader
                      value={field.value || ""}
                      onChange={field.onChange}
                      accept="any"
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">Upload a PDF or video file, or paste a direct URL below.</p>
                  <Input
                    placeholder="Or paste a URL (e.g. https://...)"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="mt-1"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Image (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4">
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
