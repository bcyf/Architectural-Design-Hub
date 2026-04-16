import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListFaqsAll, getListFaqsAllQueryKey,
  useCreateFaq, useUpdateFaq, useDeleteFaq,
  Faq,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, HelpCircle, GripVertical, Eye, EyeOff } from "lucide-react";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  order: z.coerce.number().default(0),
  isPublished: z.boolean().default(true),
});
type FaqFormValues = z.infer<typeof faqSchema>;

function FaqFormDialog({
  open,
  onOpenChange,
  editing,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Faq | null;
  nextOrder: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    values: {
      question: editing?.question ?? "",
      answer: editing?.answer ?? "",
      order: editing?.order ?? nextOrder,
      isPublished: editing?.isPublished ?? true,
    },
  });

  const onSubmit = (data: FaqFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFaqsAllQueryKey() });
            toast({ title: "FAQ updated." });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFaqsAllQueryKey() });
            toast({ title: "FAQ created." });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to create", variant: "destructive" }),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit FAQ" : "Add New FAQ"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="question" render={({ field }) => (
              <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. How do I become a member?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="answer" render={({ field }) => (
              <FormItem>
                <FormLabel>Answer</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a clear, helpful answer..."
                    className="min-h-[140px] text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="order" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Lower number = shown first</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Visibility</FormLabel>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm text-muted-foreground">
                      {field.value ? "Published" : "Hidden"}
                    </span>
                  </div>
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add FAQ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FaqManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: faqs, isLoading } = useListFaqsAll();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const deleteMutation = useDeleteFaq();
  const updateMutation = useUpdateFaq();

  const handleOpenCreate = () => {
    setEditingFaq(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFaqsAllQueryKey() });
        toast({ title: "FAQ deleted." });
        setDeleteTarget(null);
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const togglePublished = (faq: Faq) => {
    updateMutation.mutate(
      { id: faq.id, data: { question: faq.question, answer: faq.answer, order: faq.order, isPublished: !faq.isPublished } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFaqsAllQueryKey() });
          toast({ title: faq.isPublished ? "FAQ hidden from public." : "FAQ published." });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  const nextOrder = faqs ? Math.max(0, ...faqs.map(f => f.order)) + 1 : 0;
  const publishedCount = faqs?.filter(f => f.isPublished).length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mt-1">
            {publishedCount} of {faqs?.length ?? 0} questions are published on the FAQ page.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Question
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : !faqs?.length ? (
        <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No FAQs yet.</p>
          <p className="text-sm mt-1">Click <strong>Add Question</strong> to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs
            .slice()
            .sort((a, b) => a.order - b.order || a.id - b.id)
            .map((faq, i) => (
            <div
              key={faq.id}
              className={`flex items-start gap-4 p-5 rounded-lg border transition-all ${
                faq.isPublished
                  ? "bg-card border-border"
                  : "bg-muted/40 border-dashed border-border opacity-70"
              }`}
            >
              {/* Drag handle / order indicator */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <GripVertical size={16} className="text-muted-foreground/40" />
                <span className="text-[10px] font-mono text-muted-foreground">{faq.order}</span>
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-primary font-semibold">
                    Q{String(i + 1).padStart(2, "0")}
                  </span>
                  {!faq.isPublished && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                      <EyeOff size={9} /> Hidden
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-sm mb-1">{faq.question}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  title={faq.isPublished ? "Hide from public" : "Publish"}
                  onClick={() => togglePublished(faq)}
                  disabled={updateMutation.isPending}
                >
                  {faq.isPublished
                    ? <Eye size={15} className="text-green-600" />
                    : <EyeOff size={15} className="text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(faq)}>
                  <Edit size={15} className="text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(faq.id)}>
                  <Trash2 size={15} className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FaqFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingFaq(null);
        }}
        editing={editingFaq}
        nextOrder={nextOrder}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
