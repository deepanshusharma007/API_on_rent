import React from 'react';
import { RefreshCcw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  PolicyPage, PolicyHero, PolicyBody, PolicySection,
  Highlight, PolicyLink, BulletList, SummaryBox,
} from '../components/PolicyLayout';

const ELIGIBILITY = [
  {
    icon: CheckCircle,
    label: 'Eligible',
    sub: 'Within 24 h, zero API calls',
    color: 'text-emerald-400',
    bg: 'from-emerald-500/15 to-emerald-500/5',
    border: 'border-emerald-500/20',
  },
  {
    icon: AlertTriangle,
    label: 'Case-by-case',
    sub: 'Tech failures on our end',
    color: 'text-yellow-400',
    bg: 'from-yellow-500/15 to-yellow-500/5',
    border: 'border-yellow-500/20',
  },
  {
    icon: XCircle,
    label: 'Not eligible',
    sub: 'Used key or time expired',
    color: 'text-rose-400',
    bg: 'from-rose-500/15 to-rose-500/5',
    border: 'border-rose-500/20',
  },
];

export default function RefundPolicy() {
  return (
    <PolicyPage>
      <PolicyHero
        icon={RefreshCcw}
        iconColor="text-violet-400"
        iconBg="bg-violet-500/10 border-violet-500/20"
        badge="Straightforward & fair"
        title="Refund Policy"
        updated="April 12, 2025"
      />

      <PolicyBody>
        <SummaryBox items={ELIGIBILITY} />

        <PolicySection number="1" title="Overview">
          <p>
            Because AIRent sells <Highlight>time-limited digital access</Highlight> (virtual API keys),
            all sales are generally final once the key has been used. However, I want every customer to
            feel confident purchasing — so I offer a fair refund window described below.
          </p>
        </PolicySection>

        <PolicySection number="2" title="Full Refund Eligibility">
          <p>You are entitled to a <Highlight>full refund</Highlight> if ALL of the following are true:</p>
          <BulletList items={[
            'The refund request is made within 24 hours of purchase',
            'You have made zero API calls with the virtual key',
            'The rental window has not yet expired',
          ]} />
          <p>
            If all conditions are met, the refund is processed to your original payment method within
            <Highlight> 5–7 business days</Highlight> depending on your bank or payment provider.
          </p>
        </PolicySection>

        <PolicySection number="3" title="Partial Refunds">
          <p>
            Partial refunds are <Highlight>not offered</Highlight> for partially consumed token
            balances. Each plan is priced as a bundle of time and tokens — you pay for access to
            the capability, not for each token individually.
          </p>
        </PolicySection>

        <PolicySection number="4" title="Technical Failure Exceptions">
          <p>
            If AIRent experiences a platform outage or technical failure that prevents you from using
            a rental you purchased, I will evaluate your case individually and may offer a refund or
            credit at my discretion. Evidence of the failure (error logs, screenshots) helps resolve
            these faster.
          </p>
        </PolicySection>

        <PolicySection number="5" title="Non-Refundable Situations">
          <BulletList items={[
            'You have made one or more API calls with the key',
            'The 24-hour refund window has passed',
            'The rental window has already expired',
            'The refund request appears to be an attempt to abuse the policy',
            'The account was suspended due to Terms of Service violations',
          ]} />
        </PolicySection>

        <PolicySection number="6" title="How to Request a Refund">
          <p>Email <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink> with:</p>
          <BulletList items={[
            'Subject line: "Refund Request — [your order/payment reference]"',
            'The email address associated with your AIRent account',
            'Your Cashfree payment reference or order ID',
            'Brief reason for the request',
          ]} />
          <p>
            I aim to respond within <Highlight>2 business hours</Highlight> during Mon–Sat, 10 AM–8 PM IST.
            Approved refunds are initiated within 24 hours of approval.
          </p>
        </PolicySection>

        <PolicySection number="7" title="Contact">
          <p>
            Refund questions or disputes:{' '}
            <PolicyLink href="mailto:deepanshu2210sharma@gmail.com">deepanshu2210sharma@gmail.com</PolicyLink>
            {' '}· WhatsApp: <PolicyLink href="tel:+919131770985">+91 91317 70985</PolicyLink>
          </p>
        </PolicySection>
      </PolicyBody>
    </PolicyPage>
  );
}
