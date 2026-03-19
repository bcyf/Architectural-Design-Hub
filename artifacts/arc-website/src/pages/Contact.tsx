import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useSubmitContact } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, MapPin } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function Contact() {
  const { toast } = useToast();
  const submitMutation = useSubmitContact();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Message Sent",
          description: "We've received your message and will get back to you shortly.",
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <SectionHeader title="Get in Touch" subtitle="Contact Us" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form Side */}
          <div>
            <div className="mb-10 bg-secondary p-8 border-l-4 border-primary">
              <h3 className="font-display font-bold text-xl mb-4">Visit the Studio</h3>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="text-primary shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-medium text-foreground">Architecture Building</p>
                    <p>Room 402, Main Campus</p>
                    <p>Office Hours: Mon-Thu, 10am - 4pm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="text-primary shrink-0" size={20} />
                  <p>info@arc-student.org</p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs tracking-wider">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="rounded-none border-border focus-visible:ring-primary bg-card" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs tracking-wider">Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} className="rounded-none border-border focus-visible:ring-primary bg-card" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider">Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="How can we help?" {...field} className="rounded-none border-border focus-visible:ring-primary bg-card" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider">Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Your message here..." 
                          className="min-h-[150px] rounded-none border-border focus-visible:ring-primary bg-card resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full rounded-none uppercase tracking-widest text-sm"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>
          </div>

          {/* FAQ Side */}
          <div>
            <h3 className="font-display font-bold text-3xl mb-8">Frequently Asked Questions</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-border">
                <AccordionTrigger className="text-left font-medium text-lg hover:text-primary">How do I become a formal member of ARC?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Membership is open to all enrolled architecture and design students. You can sign up during our kickoff event in the fall semester, or speak to any board member during office hours in Room 402. Membership fees are $20/semester which covers access to premium resources and discounted event tickets.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-border">
                <AccordionTrigger className="text-left font-medium text-lg hover:text-primary">Can non-architecture students attend events?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes! Most of our guest lectures and public exhibitions are open to the entire university community. However, specific technical workshops and portfolio reviews are prioritized for members and current architecture students.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-border">
                <AccordionTrigger className="text-left font-medium text-lg hover:text-primary">How can I submit my project to the gallery?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  We review gallery submissions on a rolling basis. Please email a high-resolution PDF or images of your work, along with a brief 100-word description and your studio professor's name to gallery@arc-student.org.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-border">
                <AccordionTrigger className="text-left font-medium text-lg hover:text-primary">Do you offer software tutoring?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes, we host monthly "Tech Tips" workshops focusing on Rhino, Revit, AutoCAD, and Adobe Creative Cloud. We also maintain a peer-tutoring network. Check the Resources tab for more information on software support.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
