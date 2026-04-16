import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListGalleryImages, getListGalleryImagesQueryKey, 
  useCreateGalleryImage, useUpdateGalleryImage, useDeleteGalleryImage,
  GalleryImage
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Plus, Edit, Trash2, Image as ImageIcon, X, Images } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const gallerySchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional().or(z.literal("")),
  imageUrl: z.string().min(1, "Required"),
  additionalImages: z.array(z.string()).optional().default([]),
  category: z.string().min(1, "Required"),
  author: z.string().min(1, "Required"),
  year: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof gallerySchema>;

function AdditionalImagesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const add = () => onChange([...value, ""]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, url: string) => {
    const next = [...value];
    next[i] = url;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Additional Photos</p>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add Photo
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded p-4 text-center">
          No additional photos. Click "Add Photo" to include more images in this post.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((url, i) => (
            <div key={i} className="relative border border-border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photo {i + 2}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <ImageUploader value={url} onChange={(newUrl) => update(i, newUrl)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GalleryManager() {
  const { data: images, isLoading } = useListGalleryImages();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const createMutation = useCreateGalleryImage();
  const updateMutation = useUpdateGalleryImage();
  const deleteMutation = useDeleteGalleryImage();

  const defaultValues: FormValues = {
    title: "", description: "", imageUrl: "", additionalImages: [],
    category: "studio-1st", author: "", year: new Date().getFullYear().toString()
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(gallerySchema),
    defaultValues,
  });

  const handleOpenCreate = () => {
    setEditingImage(null);
    form.reset(defaultValues);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (image: GalleryImage) => {
    setEditingImage(image);
    form.reset({
      title: image.title,
      description: image.description || "",
      imageUrl: image.imageUrl,
      additionalImages: (image.additionalImages as string[] | null) ?? [],
      category: image.category,
      author: image.author,
      year: image.year,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      additionalImages: data.additionalImages?.filter(Boolean) ?? [],
    };
    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleryImagesQueryKey() });
          toast({ title: "Gallery post updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleryImagesQueryKey() });
          toast({ title: "Gallery post added" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGalleryImagesQueryKey() });
        toast({ title: "Gallery post deleted" });
        setItemToDelete(null);
      }
    });
  };

  const additionalImages = form.watch("additionalImages") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Gallery Management</h1>
          <p className="text-muted-foreground mt-1">Manage the student portfolio gallery. Each post can include multiple photos.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Post
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : images?.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
          <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
          <p>No gallery posts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images?.map((image) => {
            const extraCount = (image.additionalImages as string[] | null)?.filter(Boolean).length ?? 0;
            const totalPhotos = 1 + extraCount;
            return (
              <div key={image.id} className="group relative bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src={image.imageUrl} alt={image.title} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                  {totalPhotos > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Images className="w-3 h-3" />
                      {totalPhotos} photos
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => handleOpenEdit(image)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setItemToDelete(image.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <Badge variant="outline" className="w-fit mb-2 text-[10px] uppercase">{image.category.replace("-", " ")}</Badge>
                  <h3 className="font-medium text-sm line-clamp-1">{image.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{image.author} • {image.year}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingImage ? "Edit Gallery Post" : "Add Gallery Post"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Photo</FormLabel>
                  <FormControl>
                    <ImageUploader value={field.value || ""} onChange={field.onChange} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <AdditionalImagesField
                value={additionalImages}
                onChange={(urls) => form.setValue("additionalImages", urls)}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="studio-1st">1st Year Studio</SelectItem>
                        <SelectItem value="studio-2nd">2nd Year Studio</SelectItem>
                        <SelectItem value="studio-3rd">3rd Year Studio</SelectItem>
                        <SelectItem value="thesis">Thesis</SelectItem>
                        <SelectItem value="models">Models</SelectItem>
                        <SelectItem value="drawings">Drawings</SelectItem>
                        <SelectItem value="competitions">Competitions</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="author" render={({ field }) => (
                <FormItem><FormLabel>Author / Student</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />

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
