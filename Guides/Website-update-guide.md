# Website update guide

Open Admin.cmd in your C&E Helping Hands Agency LLC website folder.

- Social profiles: add full business profile URLs for Facebook, Instagram, LinkedIn, YouTube, TikTok, X, and WhatsApp. Save changes. Only configured links appear in the website header and footer with recognizable SVG logos. Platform domains are validated; account ownership is not verified automatically.
- Homepage & photos: three generated images have been added. Each homepage photo slot uses a distinct image. The logo naturally repeats in navigation/footer.
- SEO & local search: enter the real domain, city, region, country, service areas, page titles/descriptions, and Search Console verification. Preview remains excluded from indexing. Public hosting, HTTPS and production authentication must be arranged before launch; this local server is accessible only on this computer. Complete and verify your Google Business Profile separately. Search ranking is not guaranteed.
- Analytics & languages: add your GA4 measurement ID. Analytics loads only with visitor consent. Connect a private Google Cloud Translation API key to enable all languages supported by that provider and automatic browser-language selection. Translation is currently unconnected; English is the fallback. Provider usage may cost money; a daily character cap is included. Actual Google account receipt/translation has not been verified without your credentials.
- Policies: edit and review the privacy, terms, cookies, accessibility, and care-information drafts against your actual operations before launch. They are not a certification of legal compliance.
- Inquiries & applications: forms continue saving locally in Admin. They do not send automatic email.

Validation: 13 existing backend checks plus 6 enhanced checks passed. Enhanced checks cover metadata, policies, local noindex protection, secret protection, social URL validation, duplicate photo paths, and a mocked translation provider/cache/limit. Browser verification confirmed Admin saving and two rendered social icons (header/footer) in an isolated preview. Test profile URLs were not added to your real site.

Official setup references:
- Google local business data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Consent mode: https://developers.google.com/tag-platform/security/guides/consent
- Cloud Translation: https://docs.cloud.google.com/translate/docs/basic/translating-text
