import React from 'react';
import { Shield, Eye, Lock, Database, Bell, Trash2 } from 'lucide-react';
import {
  PolicyPage, PolicyHero, PolicyBody, PolicySection,
  Highlight, PolicyLink, BulletList, SummaryBox,
} from '../components/PolicyLayout';

const SUMMARY = [
  { icon: Eye,      label: 'No prompt storage',   sub: 'Your prompts are never saved',    color: 'text-violet-400', bg: 'from-violet-500/15 to-violet-500/5',   border: 'border-violet-500/20' },
  { icon: Lock,     label: 'PII auto-masked',      sub: 'Emails, phones redacted in-flight', color: 'text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/20' },
  { icon: Database, label: 'Minimal data kept',    sub: 'Only usage metadata stored',      color: 'text-sky-400',    bg: 'from-sky-500/15 to-sky-500/5',         border: 'border-sky-500/20' },
];

export default function PrivacyPolicy() {
  return (
    <PolicyPage>
      <PolicyHero
        icon={Shield}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10 border-emerald-500/20"
        badge="Last reviewed by Deepanshu Sharma"
        title="Privacy Policy"
        updated="April 12, 2025"
      />

      <PolicyBody>
        <SummaryBox items={SUMMARY} />

        <PolicySection number="1" title="Who We Are">
          <p>
            AIRent is a marketplace for renting time-limited virtual API keys to access top AI models.
            It is owned and operated solely by <Highlight>Deepanshu Sharma</Highlight> ("I", "me", "my").
            This Privacy Policy explains what data I collect, why I collect it, and how I protect it.
          </p>
          <p>
            Questions? Email me at{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>.
          </p>
        </PolicySection>

        <PolicySection number="2" title="Data I Collect">
          <p><Highlight>Account data</Highlight> — name and email address provided on registration.</p>
          <p><Highlight>Payment data</Highlight> — payments are handled by Cashfree Payments. I never see or store your card details.</p>
          <p><Highlight>Usage metadata</Highlight> — token count, model used, timestamp, and cost per API call.</p>
          <p><Highlight>Technical data</Highlight> — IP address (used for key pinning security), browser type, and access logs.</p>
          <p>I do <Highlight>not</Highlight> store prompt content. Prompts are forwarded in real time to the AI provider and discarded immediately.</p>
        </PolicySection>

        <PolicySection number="3" title="How I Use Your Data">
          <BulletList items={[
            'Provision and manage your virtual API key rentals',
            'Send your API key and invoices via email',
            'Monitor token and spending limits to enforce plan caps',
            'Detect abuse and maintain platform security',
            'Respond to your support requests',
            'Comply with legal obligations',
          ]} />
        </PolicySection>

        <PolicySection number="4" title="PII Masking">
          <p>
            Before forwarding your prompt to an AI provider, AIRent automatically redacts common
            personally identifiable information (PII) in-flight:
          </p>
          <BulletList items={[
            'Email addresses',
            'Phone numbers',
            'Social Security / national ID numbers',
            'Credit and debit card numbers',
          ]} />
          <p>
            This is a best-effort safety layer and does not constitute a guarantee. Do not include
            sensitive PII in prompts intentionally.
          </p>
        </PolicySection>

        <PolicySection number="5" title="Cookies & Tracking">
          <p>
            AIRent uses only <Highlight>functional cookies</Highlight> required for authentication (JWT
            stored in localStorage) and session management. No advertising or cross-site tracking
            cookies are used.
          </p>
        </PolicySection>

        <PolicySection number="6" title="Third-Party Services">
          <p>I share data with the following sub-processors only as necessary:</p>
          <BulletList items={[
            'Cashfree Payments — payment processing (PCI DSS compliant)',
            'OpenAI, Anthropic, Google — AI model inference (your prompts are forwarded under their privacy policies)',
            'Hosting provider — server infrastructure',
          ]} />
          <p>I do not sell, rent, or trade your personal data with any third party for marketing purposes.</p>
        </PolicySection>

        <PolicySection number="7" title="Data Retention">
          <p>
            Account data is retained for as long as your account is active. Usage metadata is retained
            for <Highlight>12 months</Highlight> for billing integrity and dispute resolution, then deleted.
            If you request account deletion, all personal data is permanently removed within{' '}
            <Highlight>30 days</Highlight>.
          </p>
        </PolicySection>

        <PolicySection number="8" title="Your Rights">
          <BulletList items={[
            'Access — request a copy of data I hold about you',
            'Correction — ask me to fix inaccurate data',
            'Deletion — request full account and data deletion',
            'Portability — receive your usage data in CSV format',
            'Objection — object to processing in certain circumstances',
          ]} />
          <p>
            To exercise any right, email{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>.
            I will respond within <Highlight>30 days</Highlight>.
          </p>
        </PolicySection>

        <PolicySection number="9" title="Security">
          <p>
            All data is transmitted over <Highlight>TLS 1.2+</Highlight>. API keys are stored hashed.
            Virtual keys are IP-pinned after first use. Passwords are hashed with bcrypt.
            I perform regular security reviews and apply patches promptly.
          </p>
        </PolicySection>

        <PolicySection number="10" title="Children's Privacy">
          <p>
            AIRent is not directed at children under 13. I do not knowingly collect personal data from
            anyone under 13. If you believe a child has provided data, email me immediately.
          </p>
        </PolicySection>

        <PolicySection number="11" title="Changes to This Policy">
          <p>
            I may update this policy periodically. Material changes will be announced via email and an
            in-dashboard notice at least <Highlight>7 days</Highlight> before they take effect.
            Continued use after the effective date constitutes acceptance.
          </p>
        </PolicySection>

        <PolicySection number="12" title="Contact">
          <p>
            For any privacy-related question or request, contact:{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>
          </p>
        </PolicySection>
      </PolicyBody>
    </PolicyPage>
  );
}
