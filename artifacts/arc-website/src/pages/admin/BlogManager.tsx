import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListNews, getListNewsQueryKey, 
  useCreateNewsPost, useUpdateNewsPost, useDeleteNewsPost,
  NewsPost
} from "@workspace/api-client-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Plus, Edit, Trash2, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

function InsertLinkDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInsert: (text: string, url: string) => void;
}) {
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const handleInsert = () => {
    if (!linkText.trim() || !linkUrl.trim()) return;
    onInsert(linkText.trim(), linkUrl.trim());
    setLinkText("");
    setLinkUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogDescription>The link will be inserted at your cursor position in the article content.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-sm font-medium mb-1 block">Display Text</label>
            <Input
              placeholder="e.g. Click here"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL</label>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInsert()}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleInsert} disabled={!linkText.trim() || !linkUrl.trim()}>Insert</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const newsSchema = z.object({
  title: z.string().min(1, "Required"),
  excerpt: z.string().min(1, "Required"),
  content: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  author: z.string().min(1, "Required"),
  authorRole: z.string().min(1, "Required"),
  imageUrl: z.string().optional().or(z.literal("")),
  readTime: z.coerce.number().min(1).default(5),
});

type FormValues = z.infer<typeof newsSchema>;

export default function BlogManager() {
  const { data: posts, isLoading } = useListNews();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = useCreateNewsPost();
  const updateMutation = useUpdateNewsPost();
  const deleteMutation = useDeleteNewsPost();

  const form = useForm<FormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: "", excerpt: "", content: "", category: "news", author: "", authorRole: "", imageUrl: "", readTime: 5
    },
  });

  const handleOpenCreate = () => {
    setEditingPost(null);
    form.reset({ title: "", excerpt: "", content: "", category: "news", author: "", authorRole: "", imageUrl: "", readTime: 5 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (post: NewsPost) => {
    setEditingPost(post);
    form.reset({
      title: post.title, excerpt: post.excerpt, content: post.content,
      category: post.category, author: post.author, authorRole: post.authorRole,
      imageUrl: post.imageUrl || "", readTime: post.readTime,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
          toast({ title: "Post updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
          toast({ title: "Post created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const insertLink = (text: string, url: string) => {
    const textarea = contentTextareaRef.current;
    const currentValue = form.getValues("content");
    const markdown = `[${text}](${url})`;
    if (textarea) {
      const start = textarea.selectionStart ?? currentValue.length;
      const end = textarea.selectionEnd ?? currentValue.length;
      const newValue = currentValue.slice(0, start) + markdown + currentValue.slice(end);
      form.setValue("content", newValue, { shouldDirty: true });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdown.length, start + markdown.length);
      }, 0);
    } else {
      form.setValue("content", currentValue + markdown, { shouldDirty: true });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
        toast({ title: "Post deleted" });
        setItemToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Blog & News</h1>
          <p className="text-muted-foreground mt-1">Manage articles in "The Drafting Board".</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Post
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Post Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : posts?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found.</TableCell></TableRow>
            ) : (
              posts?.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">{post.title}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{post.category.replace("-", " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{post.author}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(post)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItemToDelete(post.id)}>
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
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="reviews">Reviews</SelectItem>
                        <SelectItem value="opinion">Opinion</SelectItem>
                        <SelectItem value="alumni-spotlight">Alumni Spotlight</SelectItem>
                        <SelectItem value="tech-tips">Tech Tips</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="readTime" render={({ field }) => (
                  <FormItem><FormLabel>Read Time (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="author" render={({ field }) => (
                  <FormItem><FormLabel>Author Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="authorRole" render={({ field }) => (
                  <FormItem><FormLabel>Author Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="excerpt" render={({ field }) => (
                <FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel>Full Content</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setIsLinkDialogOpen(true)}
                    >
                      <Link2 className="w-3 h-3" /> Insert Link
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      className="h-48 font-mono text-sm"
                      {...field}
                      ref={(el) => {
                        (contentTextareaRef as any).current = el;
                        field.ref(el);
                      }}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use <code className="bg-muted px-1 rounded">[link text](https://url.com)</code> to add clickable links. Separate paragraphs with a blank line.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image</FormLabel>
                    <FormControl>
                      <ImageUploader value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save Post</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <InsertLinkDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onInsert={insertLink}
      />

      <DeleteConfirmDialog 
        open={!!itemToDelete} 
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
