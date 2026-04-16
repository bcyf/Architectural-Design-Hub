import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListFaqs } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function FAQ() {
  const { data: faqs, isLoading } = useListFaqs();

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-12 border-b border-border pb-8">
          <SectionHeader title="Frequently Asked Questions" subtitle="Got Questions?" />
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Find answers to common questions about joining ASA, attending events, and making the most of your time as an architecture student.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-none" />
            ))}
          </div>
        ) : !faqs?.length ? (
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No FAQs yet.</p>
            <p className="text-sm mt-1">Check back soon — we're working on it!</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={faq.id}
                value={`faq-${faq.id}`}
                className="border border-border px-6 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/5 transition-colors"
              >
                <AccordionTrigger className="font-display font-semibold text-left text-base hover:text-primary hover:no-underline py-5 gap-4">
                  <span className="text-primary font-mono text-sm mr-1 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pl-8 whitespace-pre-line">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* CTA */}
        <div className="mt-16 p-8 bg-secondary border border-border text-center">
          <h3 className="font-display text-xl font-bold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Can't find what you're looking for? Reach out to us directly and we'll get back to you.
          </p>
          <Button className="rounded-none" asChild>
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
