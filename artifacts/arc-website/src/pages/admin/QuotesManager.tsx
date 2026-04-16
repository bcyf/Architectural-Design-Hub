import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListQuotes, getListQuotesQueryKey,
  useCreateQuote, useUpdateQuote, useDeleteQuote, useActivateQuote,
  Quote,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, Quote as QuoteIcon } from "lucide-react";

const quoteSchema = z.object({
  text: z.string().min(1, "Quote text is required"),
  author: z.string().min(1, "Author is required"),
});
type QuoteFormValues = z.infer<typeof quoteSchema>;

function QuoteFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Quote | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    values: {
      text: editing?.text ?? "",
      author: editing?.author ?? "",
    },
  });

  const onSubmit = (data: QuoteFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: { ...data, isActive: editing.isActive } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
            toast({ title: "Quote updated." });
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
            queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
            toast({ title: "Quote added." });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to create", variant: "destructive" }),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit Quote" : "Add New Quote"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="text" render={({ field }) => (
              <FormItem>
                <FormLabel>Quote Text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Architecture is the learned game, correct and magnificent, of forms assembled in the light."
                    className="min-h-[120px] text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="author" render={({ field }) => (
              <FormItem>
                <FormLabel>Author</FormLabel>
                <FormControl>
                  <Input placeholder="Le Corbusier" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add Quote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function QuotesManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: quotes, isLoading } = useListQuotes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const activateMutation = useActivateQuote();
  const deleteMutation = useDeleteQuote();

  const handleOpenCreate = () => {
    setEditingQuote(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (q: Quote) => {
    setEditingQuote(q);
    setDialogOpen(true);
  };

  const handleActivate = (id: number) => {
    activateMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
        toast({ title: "Quote set as active on homepage." });
      },
      onError: () => toast({ title: "Failed to activate quote", variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
        toast({ title: "Quote deleted." });
        setDeleteTarget(null);
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const activeQuote = quotes?.find(q => q.isActive);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Homepage Quotes</h1>
          <p className="text-muted-foreground mt-1">
            Manage the inspirational quote displayed in the homepage banner. Only one can be active at a time.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Quote
        </Button>
      </div>

      {/* Active quote preview */}
      {activeQuote && (
        <div className="relative bg-foreground text-background rounded-lg overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-drafting-grid pointer-events-none" />
          <div className="relative p-8 text-center">
            <p className="text-5xl text-primary font-display leading-none mb-4">"</p>
            <blockquote className="text-xl md:text-2xl font-display font-medium leading-tight mb-4 max-w-2xl mx-auto">
              {activeQuote.text}
            </blockquote>
            <cite className="text-background/60 uppercase tracking-widest text-sm font-medium">
              — {activeQuote.author}
            </cite>
            <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground gap-1.5">
              <Star size={11} className="fill-current" /> Active on Homepage
            </Badge>
          </div>
        </div>
      )}

      {/* All quotes list */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)
        ) : !quotes?.length ? (
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <QuoteIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No quotes yet. Add your first inspirational quote above.</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div
              key={quote.id}
              className={`flex items-start gap-6 p-5 rounded-lg border transition-all ${
                quote.isActive
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="text-3xl text-primary font-display leading-none shrink-0 mt-1">"</div>
              <div className="flex-grow min-w-0">
                <p className="font-display text-base md:text-lg font-medium leading-snug mb-1 line-clamp-3">
                  {quote.text}
                </p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">— {quote.author}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {quote.isActive ? (
                  <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <Star size={10} className="fill-primary" /> Active
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleActivate(quote.id)}
                    disabled={activateMutation.isPending}
                  >
                    <Star size={12} /> Set Active
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(quote)}>
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(quote.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <QuoteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingQuote(null);
        }}
        editing={editingQuote}
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
