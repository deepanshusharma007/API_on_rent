import React from 'react';
import { FileText } from 'lucide-react';
import {
  PolicyPage, PolicyHero, PolicyBody, PolicySection,
  Highlight, PolicyLink, BulletList,
} from '../components/PolicyLayout';

export default function TermsOfService() {
  return (
    <PolicyPage>
      <PolicyHero
        icon={FileText}
        iconColor="text-sky-400"
        iconBg="bg-sky-500/10 border-sky-500/20"
        badge="Effective April 12, 2025"
        title="Terms of Service"
        updated="April 12, 2025"
      />

      <PolicyBody>
        <PolicySection number="1" title="Agreement to Terms">
          <p>
            By creating an account or using AIRent in any way, you agree to be bound by these Terms
            of Service. AIRent is owned and operated solely by <Highlight>Deepanshu Sharma</Highlight>.
            If you do not agree, do not use the service.
          </p>
        </PolicySection>

        <PolicySection number="2" title="Description of Service">
          <p>
            AIRent provides a marketplace where registered users can purchase time-limited virtual API
            keys ("rentals") to access third-party AI models including OpenAI, Anthropic, and Google
            Gemini via an OpenAI-compatible proxy endpoint.
          </p>
        </PolicySection>

        <PolicySection number="3" title="Eligibility">
          <BulletList items={[
            'You must be at least 13 years old to create an account.',
            'You must provide accurate and complete registration information.',
            'One account per person or organisation. Sharing accounts is not permitted.',
            'You are responsible for all activity that occurs under your account.',
          ]} />
        </PolicySection>

        <PolicySection number="4" title="Payments & Plans">
          <p>
            All purchases are <Highlight>one-time payments</Highlight> for a specific token cap and
            rental window. There are no subscriptions or automatic renewals.
          </p>
          <p>
            Prices are displayed in <Highlight>INR</Highlight> and are subject to change without notice.
            Payments are processed by Cashfree Payments; I never handle or store your payment credentials.
          </p>
          <p>
            Unused tokens and remaining time do <Highlight>not roll over</Highlight> after a rental
            expires. Whichever limit (tokens or time) is reached first ends the rental.
          </p>
        </PolicySection>

        <PolicySection number="5" title="Refunds">
          <p>
            Refunds may be issued within <Highlight>24 hours of purchase</Highlight> if you have made
            zero API calls. See the{' '}
            <PolicyLink href="/refund-policy">Refund Policy</PolicyLink> for full details. I reserve
            the right to deny refunds where abuse is suspected.
          </p>
        </PolicySection>

        <PolicySection number="6" title="Acceptable Use">
          <p>You agree not to use AIRent to:</p>
          <BulletList items={[
            'Generate content that is illegal, harmful, threatening, or abusive',
            'Attempt to bypass safety filters or jailbreak AI models',
            'Scrape, reverse-engineer, or reproduce the AIRent platform',
            'Share, sell, or sub-license your virtual API key to others',
            'Send prompts containing real personal data (PII) of third parties without consent',
            'Automate purchases or rentals to circumvent rate or spending limits',
            'Engage in any activity that violates the terms of the underlying AI provider',
          ]} />
        </PolicySection>

        <PolicySection number="7" title="API Key Usage Rules">
          <BulletList items={[
            'Your virtual key is for your personal or organisational use only.',
            'After the first API request, the key is pinned to that IP address.',
            'If you change networks and get locked out, contact me to reset the IP pin.',
            'Keys expire at the end of the rental window regardless of token balance.',
          ]} />
        </PolicySection>

        <PolicySection number="8" title="Spending Limits & Suspension">
          <p>
            I reserve the right to impose spending limits and automatically suspend rentals if unusual
            usage patterns are detected that could result in outsized costs. You will be notified by
            email when a suspension occurs.
          </p>
        </PolicySection>

        <PolicySection number="9" title="Intellectual Property">
          <p>
            The AIRent platform, including its code, design, branding, and content, is owned by
            Deepanshu Sharma. You are granted a limited, non-exclusive, non-transferable licence to use
            the service for its intended purpose.
          </p>
          <p>
            Content generated via the AI models through AIRent is subject to the IP policies of the
            respective AI providers (OpenAI, Anthropic, Google).
          </p>
        </PolicySection>

        <PolicySection number="10" title="Disclaimer of Warranties">
          <p>
            AIRent is provided <Highlight>"as is"</Highlight> and <Highlight>"as available"</Highlight>{' '}
            without warranties of any kind, express or implied. I do not warrant that the service will
            be uninterrupted, error-free, or that AI model outputs will be accurate.
          </p>
        </PolicySection>

        <PolicySection number="11" title="Limitation of Liability">
          <p>
            To the maximum extent permitted by law, my total liability to you for any claim arising
            from your use of AIRent shall not exceed the amount you paid for the rental(s) in question.
            I am not liable for indirect, incidental, special, or consequential damages.
          </p>
        </PolicySection>

        <PolicySection number="12" title="Termination">
          <p>
            I may terminate or suspend your account immediately, without prior notice, if you violate
            these Terms. Upon termination, your active rentals are deactivated and no refund is issued
            for the remaining time or tokens.
          </p>
          <p>
            You may delete your account at any time by emailing{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>.
          </p>
        </PolicySection>

        <PolicySection number="13" title="Governing Law">
          <p>
            These Terms are governed by the laws of <Highlight>India</Highlight>. Any disputes shall
            be resolved exclusively in the courts of India. The UN Convention on Contracts for the
            International Sale of Goods does not apply.
          </p>
        </PolicySection>

        <PolicySection number="14" title="Contact">
          <p>
            For any questions about these Terms, email:{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>
          </p>
        </PolicySection>
      </PolicyBody>
    </PolicyPage>
  );
}
