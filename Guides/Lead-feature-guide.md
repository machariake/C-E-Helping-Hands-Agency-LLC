# Callback and follow-up features

The website includes a short callback form at http://localhost:4173/request-callback, a homepage callback link, and mobile Call / Request a callback buttons.

Open **Open Admin.cmd** in your website folder:

- **Inquiries & applications:** review preferences, add private notes, set a follow-up date, and track New, Contacted, Consultation scheduled, Client gained, or Closed. Care counts exclude job applications. Overdue follow-ups appear first. Dates use the device timezone shown on the dashboard. Click **Save follow-up** for each record.
- **Lead notifications:** enter a verified Resend sender email, your team inbox, and a Resend API key. Then enable alerts and optional visitor receipts. This is currently unconnected. No real email was sent during testing. Saving settings does not send older unconfigured requests.

Team alerts contain only the request type and reference. Contact details and care notes remain in Admin. Visitor receipts require email; the callback form does not. Provider acceptance is not confirmation of delivery. Keep the server running to process queued messages. Temporary failures retry up to three times within 23 hours. Check failures in Admin and follow up directly.

The website remains local. Public hosting, a domain, confirmed business details and service areas, and a Google Business Profile are still needed to reach nearby clients online.

Validation: 13 existing checks and 7 new checks passed. Browser tests confirmed callback submission without email, saved notes/status/date, overdue counts, and notification settings. A 390px viewport check found no horizontal overflow. Email-provider tests were simulated. QA data was not copied into your real inbox.

[Resend setup documentation](https://resend.com/docs/api-reference/emails/send-email)
