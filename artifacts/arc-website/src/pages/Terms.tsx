import { PageWrapper } from "@/components/layout/PageWrapper";
import { Link } from "wouter";

const EFFECTIVE_DATE = "2022";
const ORG_NAME = "Architecture Student Association FBC";
const SHORT_NAME = "ASA FBC";
const EMAIL = "archstudentassociationfbc@gmail.com";
const SITE_URL = "https://arc-website.replit.app";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-bold mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-primary font-medium uppercase tracking-widest text-xs mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            <strong>Organisation:</strong> {ORG_NAME} ("{SHORT_NAME}")
          </p>
        </div>

        <div className="prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed mb-10 text-sm">
            Please read these Terms of Service ("Terms") carefully before using the website at{" "}
            <a href={SITE_URL} className="text-primary hover:underline">{SITE_URL}</a> operated by{" "}
            {ORG_NAME} ("{SHORT_NAME}", "we", "us", or "our"). By accessing or using our website, you agree
            to be bound by these Terms. If you do not agree to these Terms, please do not use our website.
          </p>

          <Section title="1. About This Website">
            <p>
              This website is operated by the {ORG_NAME}, a student-led organisation based at the
              Architecture Building, Tree Planting University Campus. The website provides information about
              our association, events, resources, gallery, and blog content for current and prospective
              architecture students.
            </p>
            <p>
              This website is non-commercial in nature. We do not sell goods or services through this platform.
            </p>
          </Section>

          <Section title="2. Acceptable Use">
            <p>By using this website, you agree that you will not:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the website in any way that is unlawful, harmful, or fraudulent.</li>
              <li>Submit false, misleading, or inaccurate information through any forms.</li>
              <li>Attempt to gain unauthorised access to any part of the website or its infrastructure.</li>
              <li>Transmit any unsolicited or unauthorised advertising or promotional material.</li>
              <li>Use automated scripts, bots, or scrapers to access or collect data from this website without our permission.</li>
              <li>Engage in any conduct that could damage, disable, or impair the website.</li>
              <li>Impersonate any person or entity, including ASA FBC members or staff.</li>
            </ul>
          </Section>

          <Section title="3. Event RSVPs and Registrations">
            <p>
              You may RSVP to events listed on our website by providing your name and email address. By
              submitting an RSVP, you confirm that the information provided is accurate and that you intend
              to attend the event.
            </p>
            <p>
              RSVPs are non-binding and do not guarantee entry where capacity is limited. We reserve the
              right to cancel or modify events at any time. In such cases, we will endeavour to notify
              registered attendees using the contact information provided.
            </p>
            <p>
              Your RSVP information is used solely for event administration purposes. Please refer to our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details
              on how this data is stored and managed.
            </p>
          </Section>

          <Section title="4. Newsletter Subscription">
            <p>
              By subscribing to <em>The Blueprint</em>, our newsletter, you consent to receive periodic
              email communications from ASA FBC relating to events, resources, and association updates.
            </p>
            <p>
              You may unsubscribe at any time by using the unsubscribe link included in each newsletter
              or by contacting us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
              We will not send commercial or promotional content from third parties.
            </p>
          </Section>

          <Section title="5. Contact Form Submissions">
            <p>
              Messages submitted through our contact form are received and reviewed by ASA FBC committee
              members. We aim to respond within 5 business days. Submission of a contact form does not
              create any contractual obligation on either party.
            </p>
            <p>
              We reserve the right not to respond to messages that are offensive, abusive, or otherwise
              inappropriate.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              Unless otherwise stated, all content on this website — including text, images, graphics,
              logos, project photographs, and blog articles — is the property of {ORG_NAME} or the
              individual student or contributor who created it, and is protected by applicable copyright
              and intellectual property laws.
            </p>
            <p>
              You may view, download, and print content from this website for personal, non-commercial
              use only, provided you:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Do not remove any copyright or attribution notices.</li>
              <li>Do not modify the content.</li>
              <li>Do not reproduce or redistribute it without our prior written consent.</li>
            </ul>
            <p className="mt-3">
              Student project work displayed in the gallery remains the intellectual property of the
              respective students. Reproduction or use of student work requires their individual consent.
            </p>
          </Section>

          <Section title="7. User-Submitted Content">
            <p>
              If you submit content to us (such as via the contact form or by contributing to association
              activities), you grant {SHORT_NAME} a non-exclusive, royalty-free licence to use, display,
              and share that content in connection with our association's activities, including on this
              website and in newsletters.
            </p>
            <p>
              You represent that you own or have the necessary rights to any content you submit, and that
              such content does not infringe the rights of any third party.
            </p>
          </Section>

          <Section title="8. Third-Party Links">
            <p>
              Our website may contain links to third-party websites, including the university portal,
              industry organisations, and external resources. These links are provided for convenience and
              informational purposes only. We have no control over the content or policies of those sites
              and accept no responsibility for them.
            </p>
            <p>
              The inclusion of any link does not imply endorsement by ASA FBC of that website or its content.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              This website is provided on an "as is" and "as available" basis without warranties of any
              kind, either express or implied. We do not warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>The website will be uninterrupted, error-free, or free of viruses.</li>
              <li>The information on the website is complete, accurate, or current.</li>
              <li>Any defects will be corrected.</li>
            </ul>
            <p className="mt-3">
              Information published on this website (including event details, job listings, and resources)
              is provided in good faith and for general informational purposes only. It does not constitute
              professional advice of any kind.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, {ORG_NAME} and its committee members,
              officers, and volunteers shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of, or inability to use, this website
              or its content — even if we have been advised of the possibility of such damages.
            </p>
            <p>
              Our total liability to you for any claim arising in connection with these Terms or your use
              of the website shall not exceed the amount you paid us in the twelve months preceding the
              claim (which, given the non-commercial nature of this website, would typically be zero).
            </p>
          </Section>

          <Section title="11. Privacy">
            <p>
              Your use of this website is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which is
              incorporated into these Terms by reference. Please review it to understand our practices
              regarding the collection and use of your personal information.
            </p>
          </Section>

          <Section title="12. Modifications to These Terms">
            <p>
              We reserve the right to revise these Terms at any time. When we make material changes, we
              will update the "Effective Date" at the top of this page. Your continued use of the website
              after any changes are posted constitutes your acceptance of the revised Terms.
            </p>
            <p>
              We encourage you to review these Terms periodically to stay informed of any updates.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws applicable to the
              jurisdiction in which Tree Planting University is located. Any disputes arising from these
              Terms or your use of the website shall be subject to the exclusive jurisdiction of the
              courts in that jurisdiction.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-md text-sm">
              <p className="font-semibold text-foreground">{ORG_NAME}</p>
              <p>Architecture Building, Tree Planting University Campus</p>
              <p>
                Email:{" "}
                <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>
              </p>
            </div>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-sm text-muted-foreground">
          <p>Last updated: {EFFECTIVE_DATE}</p>
          <Link href="/privacy" className="text-primary hover:underline">View Privacy Policy →</Link>
        </div>
      </div>
    </PageWrapper>
  );
}
