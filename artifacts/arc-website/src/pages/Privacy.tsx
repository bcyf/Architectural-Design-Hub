import { PageWrapper } from "@/components/layout/PageWrapper";
import { Link } from "wouter";

const EFFECTIVE_DATE = "2022";
const ORG_NAME = "Architecture Student Association FBC";
const SHORT_NAME = "ASA FBC";
const EMAIL = "archstudentassociationfbc@gmail.com";
const SITE_URL = "https://asafbc.it.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-bold mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-primary font-medium uppercase tracking-widest text-xs mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            <strong>Organisation:</strong> {ORG_NAME} ("{SHORT_NAME}")
          </p>
        </div>

        <div className="prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed mb-10 text-sm">
            {ORG_NAME} ("{SHORT_NAME}", "we", "us", or "our") is committed to protecting your personal
            information and your right to privacy. This Privacy Policy explains what information we collect,
            how we use it, and what rights you have in relation to it. By using our website at{" "}
            <a href={SITE_URL} className="text-primary hover:underline">{SITE_URL}</a>, you agree to the
            terms of this policy.
          </p>

          <Section title="1. Information We Collect">
            <p>We collect information you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Submit a contact form</strong> — we collect your name, email address, subject, and message.</li>
              <li><strong>RSVP to an event</strong> — we collect your name and email address.</li>
              <li><strong>Subscribe to our newsletter</strong> — we collect your email address and, optionally, your name.</li>
            </ul>
            <p className="mt-3">
              We do not collect payment information, government identification, or any sensitive personal data.
              We do not use tracking cookies or third-party advertising trackers.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect solely for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>To respond to your enquiries and contact form submissions.</li>
              <li>To confirm and manage your event RSVPs.</li>
              <li>To send you newsletter communications you have opted into.</li>
              <li>To administer and improve our website and events.</li>
              <li>To comply with applicable legal obligations.</li>
            </ul>
            <p className="mt-3">
              We will never sell, trade, or rent your personal information to any third party. We do not use
              your data for automated decision-making or profiling.
            </p>
          </Section>

          <Section title="3. Newsletter Communications">
            <p>
              If you subscribe to <em>The Blueprint</em>, our newsletter, you will receive periodic updates
              about events, resources, and association news. Each newsletter includes an unsubscribe option.
              You may also request removal at any time by emailing us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
            </p>
            <p>
              We do not share your email address with third-party mailing services or marketing platforms.
              Newsletter dispatch is managed internally by ASA FBC.
            </p>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We retain your personal data only for as long as is necessary for the purposes described
              in this policy:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Contact form submissions</strong> — retained for up to 12 months.</li>
              <li><strong>RSVP records</strong> — retained for up to 6 months after the event date.</li>
              <li><strong>Newsletter subscriptions</strong> — retained until you unsubscribe or request deletion.</li>
            </ul>
          </Section>

          <Section title="5. Sharing of Information">
            <p>
              We do not share your personal information with any third parties except in the following limited
              circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Legal compliance</strong> — if required by law, regulation, court order, or other
                legal process.
              </li>
              <li>
                <strong>Protection of rights</strong> — to protect the rights, property, or safety of
                {SHORT_NAME}, our members, or others.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Security">
            <p>
              We implement appropriate technical and organisational measures to protect your personal
              information against unauthorised access, alteration, disclosure, or destruction. Our website
              uses HTTPS encryption for all data transmission.
            </p>
            <p>
              While we strive to use commercially acceptable means to protect your data, no method of
              transmission over the Internet or method of electronic storage is 100% secure. We cannot
              guarantee absolute security.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Right of access</strong> — to request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification</strong> — to request correction of inaccurate data.</li>
              <li><strong>Right to erasure</strong> — to request deletion of your data.</li>
              <li><strong>Right to withdraw consent</strong> — for example, to unsubscribe from our newsletter at any time.</li>
              <li><strong>Right to object</strong> — to object to certain processing of your data.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>. We will
              respond within 30 days.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              Our website is not directed at children under the age of 13. We do not knowingly collect
              personal information from children. If you believe a child has provided us with personal data,
              please contact us and we will promptly delete it.
            </p>
          </Section>

          <Section title="9. Links to External Sites">
            <p>
              Our website may contain links to third-party websites, including university portals, social
              media platforms, and partner organisations. We are not responsible for the privacy practices
              or content of those sites. We encourage you to read the privacy policy of every website you visit.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the "Effective
              Date" at the top of this page. We encourage you to review this page periodically. Your continued
              use of the website after any changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have any questions or concerns about this Privacy Policy or how we handle your personal
              data, please contact us:
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
          <Link href="/terms" className="text-primary hover:underline">View Terms of Service →</Link>
        </div>
      </div>
    </PageWrapper>
  );
}
