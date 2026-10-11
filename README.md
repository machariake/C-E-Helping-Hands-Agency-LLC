# C&E Helping Hands Agency LLC

Custom home-care website with a local content manager. Built with Node.js and browser JavaScript, without runtime package dependencies. Inspired by the Caremuo layout; commercial theme source is not included.

## Run locally

Install Node.js 20 or later, then run:

```sh
npm start
```

Visit http://localhost:4173. Windows users can also double-click **Start Website.cmd**.

## Admin

For first-time setup on Windows, double-click **Open Admin.cmd** and choose your own email and password. After setup, visit http://localhost:4173/admin to sign in. The initial owner key is generated locally in `data/admin-key.txt`; it is disabled for normal API access after account creation. On other platforms, use that key in the initial `/admin#key=YOUR_LOCAL_KEY` setup URL. Never share that URL or key.

Passwords use salted scrypt hashes. Sessions use HttpOnly, SameSite cookies and expire after eight hours. Sign-out invalidates the session. Password reset links expire after 15 minutes and are single-use; recovery requires a configured Resend sender and API key. No credentials are included in this repository.

## Features

- Responsive service, about, contact, careers, resource, policy and service-area pages.
- Scroll animations, service carousel and reduced-motion support.
- Short callback requests and mobile call/callback buttons.
- Private inquiry and application inbox, résumé downloads, follow-up dates, notes, stages and overdue counts.
- Editable photography, business information, social profile icons and policies.
- Metadata, structured data, sitemap and local-preview indexing protection.
- Optional consent-based Google Analytics and Google Cloud Translation with browser-language detection.
- Optional Resend alerts and visitor receipts, with private settings and delivery-attempt status.

Unknown business details and unconfirmed services remain drafts. Fill in accurate service areas, credentials, hours, reviews and service availability in Admin.

## Private runtime data

`seed.json` contains starter website content. The server creates `data/content.json` on first run. All `data/` files, logs, environment files and `public/uploads/` are ignored by Git. Runtime data includes account hashes, connection keys, inquiries, résumés and private follow-up notes. Back it up separately in a protected location. Do not commit it.

Assets under `public/assets/` include the supplied agency logo/photos and AI-generated illustrative photography. Generated imagery is not evidence of actual staff or clients.

## Email and translation

Connect services through Admin. Nothing is connected by default. Team email alerts contain the request type and reference, with contact details remaining in Admin. Receipts require an email address; callback requests do not. The server must run to process queued notifications. Provider acceptance is not confirmed inbox delivery. Translation supports the languages returned by the configured provider, not literally every language.

## Publication

This repository is **not a public deployment**. The server intentionally binds to localhost and enforces local host/origin restrictions. GitHub Pages cannot run its Node server, admin or forms.

Before public hosting, configure the production domain, HTTPS and secure cookies, host/origin validation, persistent private storage, backups, production rate limiting, email delivery and account recovery. Review policies and service claims. Verify Google Business Profile and Search Console, then configure indexing. Do not expose this local server with a tunnel as a substitute for deployment setup.

## Tests

```sh
npm test
```

Tests use an isolated temporary copy and do not modify the live inbox. They cover routes, authorization, origin checks, validation, content changes, uploads and private résumé access.
