import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListSubscribers, getListSubscribersQueryKey,
  useDeleteSubscriber,
  useListNewsletterCampaigns, getListNewsletterCampaignsQueryKey,
  useCreateNewsletterCampaign, useUpdateNewsletterCampaign,
  useDeleteNewsletterCampaign, useSendNewsletterCampaign,
  NewsletterCampaign,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Send, Users, Mail,
  FileText, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});
type CampaignFormValues = z.infer<typeof campaignSchema>;

function StatusBadge({ status }: { status: string }) {
  if (status === "sent")
    return <Badge className="bg-green-500/10 text-green-700 border-green-500/20 gap-1.5"><CheckCircle2 size={11} /> Sent</Badge>;
  return <Badge variant="outline" className="gap-1.5 text-muted-foreground"><Clock size={11} /> Draft</Badge>;
}

function SubscribersTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: subscribers, isLoading } = useListSubscribers();
  const deleteMutation = useDeleteSubscriber();
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteMutation.mutate({ id: itemToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey() });
        toast({ title: "Subscriber removed." });
        setItemToDelete(null);
      },
      onError: () => toast({ title: "Failed to remove subscriber", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users size={16} />
          <span><strong className="text-foreground">{subscribers?.length ?? 0}</strong> total subscribers</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>#</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading…</TableCell></TableRow>
            ) : !subscribers?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No subscribers yet. The subscribe form is in the footer.</p>
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((sub, i) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                  <TableCell>
                    <a href={`mailto:${sub.email}`} className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                      <Mail size={13} /> {sub.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sub.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(sub.subscribedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(sub.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

function CampaignDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: NewsletterCampaign | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateNewsletterCampaign();
  const updateMutation = useUpdateNewsletterCampaign();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: editing?.title || "",
      subject: editing?.subject || "",
      content: editing?.content || "",
    },
  });

  useEffect(() => {
    form.reset({
      title: editing?.title || "",
      subject: editing?.subject || "",
      content: editing?.content || "",
    });
  }, [editing]);

  const onSubmit = (data: CampaignFormValues) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNewsletterCampaignsQueryKey() });
          toast({ title: "Campaign updated." });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNewsletterCampaignsQueryKey() });
          toast({ title: "Campaign saved as draft." });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit Campaign" : "Compose Newsletter"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-y-auto">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Title <span className="text-muted-foreground text-xs">(internal — not shown to subscribers)</span></FormLabel>
                <FormControl><Input placeholder="e.g. May 2026 Newsletter" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Subject Line</FormLabel>
                <FormControl><Input placeholder="e.g. 🏗️ This Month in Architecture — Studio Tips & Events" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Body</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write your newsletter content here. Plain text or basic HTML is supported."
                    className="min-h-[300px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save Draft"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SendConfirmDialog({
  campaign,
  subscriberCount,
  onClose,
}: {
  campaign: NewsletterCampaign | null;
  subscriberCount: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sendMutation = useSendNewsletterCampaign();

  const handleSend = () => {
    if (!campaign) return;
    sendMutation.mutate({ id: campaign.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNewsletterCampaignsQueryKey() });
        toast({ title: `Newsletter sent to ${subscriberCount} subscribers!` });
        onClose();
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Send size={18} className="text-primary" />
            Send Newsletter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 flex gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">This action cannot be undone.</p>
              <p>The campaign will be marked as <strong>Sent</strong> and recorded with the current subscriber count.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Campaign</span>
              <span className="font-semibold">{campaign?.title}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium max-w-[220px] text-right truncate">{campaign?.subject}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Recipients</span>
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Users size={14} /> {subscriberCount} subscribers
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleSend}
            disabled={sendMutation.isPending || subscriberCount === 0}
          >
            {sendMutation.isPending ? "Sending…" : (
              <><Send size={14} /> Send to {subscriberCount} subscribers</>
            )}
          </Button>
        </div>
        {subscriberCount === 0 && (
          <p className="text-xs text-center text-muted-foreground -mt-2">No active subscribers to send to.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function NewsletterManager() {
  const { data: campaigns, isLoading } = useListNewsletterCampaigns();
  const { data: subscribers } = useListSubscribers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<NewsletterCampaign | null>(null);
  const [sendTarget, setSendTarget] = useState<NewsletterCampaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const deleteMutation = useDeleteNewsletterCampaign();

  const handleOpenCompose = () => {
    setEditingCampaign(null);
    setComposerOpen(true);
  };

  const handleOpenEdit = (c: NewsletterCampaign) => {
    setEditingCampaign(c);
    setComposerOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNewsletterCampaignsQueryKey() });
        toast({ title: "Campaign deleted." });
        setDeleteTarget(null);
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const subscriberCount = subscribers?.length ?? 0;

  const stats = [
    { label: "Total Subscribers", value: subscriberCount, icon: Users, color: "text-blue-600" },
    { label: "Total Campaigns", value: campaigns?.length ?? 0, icon: FileText, color: "text-purple-600" },
    { label: "Sent", value: campaigns?.filter(c => c.status === "sent").length ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Drafts", value: campaigns?.filter(c => c.status === "draft").length ?? 0, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground mt-1">Manage subscribers and compose email campaigns.</p>
        </div>
        <Button onClick={handleOpenCompose} className="gap-2">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`p-2 rounded-md bg-muted ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="rounded-none border-b border-border w-full justify-start bg-transparent h-auto pb-0 gap-0">
          <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-3">
            <FileText size={14} className="mr-2" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-3">
            <Users size={14} className="mr-2" /> Subscribers ({subscriberCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Campaign</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : !campaigns?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No campaigns yet. Click <strong>New Campaign</strong> to write your first newsletter.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{c.subject}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell>
                        {c.status === "sent" ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <Users size={13} className="text-primary" /> {c.recipientCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-primary hover:text-primary"
                              onClick={() => setSendTarget(c)}
                            >
                              <Send size={13} /> Send
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subscribers" className="mt-6">
          <SubscribersTab />
        </TabsContent>
      </Tabs>

      <CampaignDialog
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) setEditingCampaign(null);
        }}
        editing={editingCampaign}
      />

      <SendConfirmDialog
        campaign={sendTarget}
        subscriberCount={subscriberCount}
        onClose={() => setSendTarget(null)}
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
