# C&E Helping Hands Agency LLC

A custom home-care website inspired by Caremuo's warm, editorial design, adapted to navy, gold and cream. No WordPress theme purchase or runtime dependencies are required. The commercial theme code and demo photos are not included.

## Open your website

Node.js 20 or later is required (already installed on this computer).

- Double-click **Start Website.cmd**, or run `npm start` from this folder.
- Website: http://localhost:4173
- Double-click **Open Admin.cmd** to open the content manager with your local access key. The PowerShell launchers are also included as an alternative.
- Alternatively open http://localhost:4173/admin and enter the access key from `data/admin-key.txt`. Keep this file private. The key stays only in the current browser session.

## Edit your site

The admin sidebar includes business details, homepage text and photo uploads, services, service areas, jobs, testimonials, resources, FAQs, website settings, and an inquiry/application inbox. Changes become visible after **Save changes**. Refresh the public page to see them.

Service content is initially draft. Only confirm services the agency actually offers within its permitted scope. Turning off preview mode hides unconfirmed services. Empty testimonials remain hidden. No unverified licenses, insurance acceptance, hours, reviews, staff credentials or company history have been invented.

The care and careers forms save to `data/submissions.json`. Résumés are stored privately in `data/resumes/` and can be downloaded through authenticated admin access. No email is sent automatically. The inbox supports search, form type filtering and New / Contacted / Closed statuses.

## Files and backups

- `public/`: website interface, styles and images.
- `server.mjs`: local web server and protected content/submission API.
- `seed.json`: initial content; used only when data/content.json does not exist.
- `data/`: live content, access key, submissions, résumés. **Private; never upload to a public repository.**
- `public/uploads/`: images uploaded through admin. Include these in your backups.

Back up the whole project, including the private data folder, to an appropriately protected location. Deleting data/content.json resets content to the original seed on next start. Do not delete it unless a reset is intended.

## Before going live

This build runs on this computer only. It has a strict local-host boundary and no public deployment. It is intentionally marked noindex with a blocking robots.txt.

Before accepting live personal information: configure a production host and HTTPS; replace the local access-key workflow with production authentication and session management; review host/origin restrictions for the production domain; configure backups, file security, retention/deletion procedures and form delivery; finalize privacy language and business details; confirm services; review accessibility in the deployed environment. Then configure the public domain, Google Business Profile, optional consent-based Analytics and Search Console verification in admin, and enable search indexing in the deployment configuration. The sitemap endpoint is `/sitemap.xml`.

Do not expose this development server using a public tunnel. Public hosting requires a reviewed deployment configuration, not just changing the listen address.

## Image provenance

`public/assets/care-at-home.png` was created with the built-in image-generation tool as illustrative brand photography, not as a picture of actual staff or clients. Final prompt: “Use case: photorealistic-natural. Asset type: wide hero photograph for a compassionate nonmedical home care agency website. A warm candid editorial photograph of an older Black woman with short silver hair and a friendly adult female caregiver in a simple muted blue blouse sharing a relaxed conversation on a cream sofa in a beautiful lived-in home, subtle natural smile, eye contact, dignified and independent feeling. Both subjects on the RIGHT half of wide landscape image, left half airy room with softly blurred cream walls and sheer curtains for overlaying website copy. Sunlit cozy living room, warm linen textures, tiny sage plant. Natural believable skin and hands, documentary photography, understated premium brand feeling. No text, no logo, no watermark, no clinical hospital equipment. Wide 3:2 composition.”

Original SVG brand mark is a temporary editable identity, replaceable with your logo through admin.

## Validation

Run `npm test` for HTTP/API verification against an isolated temporary copy. Tests do not change your live website content or inbox. The test includes authorization, form validation, persistence, upload protection, content editing and private résumé access.
