# Marketing setup guide

For whoever sets up and runs SaveTheDates marketing. Read it once before creating any accounts or ads.

## 1. Where everything is

| Folder | What it is |
| --- | --- |
| [channels/](channels/README.md) | Ready-to-upload images and videos for Instagram, Facebook, Pinterest, Google Ads and TikTok, each with a short how-to |
| [marketing-videos/](marketing-videos/) | Master videos: the 59-second launch film (16:9) and the 10-second ad (9:16 and 4:5), each with and without music |
| [marketing-context/](marketing-context/marketing-docs/app-features-and-screenshots-guide.md) | The features guide: what the product does, approved wording, **what we can't say**, and 258 screenshots |
| [source/](source/README.md) | The code that generates the videos and images. Use it to change copy and regenerate |

## 2. Do these before spending any money

1. **Confirm the licence for the botanical artwork** (roses, olive, heather and so on). It appears in every design screenshot, so in almost every image and video, and its source and commercial-use permission aren't recorded (see section 10 of the features guide). Until the owner confirms it, run **organic posts only**. Google **Search** ads are text only, so they can start now.
2. **Ask the developer to record UTM tags** (see section 4). Without this, you can't tell which ad or post brought a visitor.
3. **Agree a monthly budget with the owner**, and the rule for stopping an ad (see section 5).

## 3. Accounts to set up

Use `hello@savethedates.co.uk` (or a shared marketing inbox) as the login for every account, not a personal email, and store the passwords in the owner's password manager.

| Platform | Set up | Key settings |
| --- | --- | --- |
| **Meta** (Facebook + Instagram) | A Facebook Page, an Instagram **professional** account linked to it, and a Business portfolio in Meta Business Suite with one ad account | Ad account **currency GBP** and **time zone Europe/London**. Neither can be changed later |
| **Google** | A Google Ads account, and a YouTube channel for hosting video ads | Currency **GBP**, time zone **London**; both are fixed after setup. Link Google Ads to YouTube. Check with the developer whether Search Console is already verified; it shows which searches find the site for free |
| **Pinterest** | A business account | Claim `savethedates.co.uk` with the **DNS TXT** method at the domain registrar; no site change needed |
| **TikTok** | A business account | Only post sounds from the Commercial Music Library |

Use the same name everywhere ("SaveTheDates") and the same handle if it's free. Profile pictures and bios are in each channel folder.

## 4. Measuring what works

### What the site records today

The site uses **Umami**, a cookieless, privacy-friendly analytics service, so it needs no cookie banner. It only counts visits to public marketing pages: the homepage, What we offer, Digital save the date, the design examples, the demo, the legal pages, sign-in and sign-up. Couples' wedding pages, dashboards and guest replies are **never** tracked.

In the Umami dashboard you can see:
- visitors per page, including how many reach **sign-up**
- **referrers**, i.e. where visitors came from (instagram.com, facebook.com, pinterest, google and so on)
- country and device

### What it doesn't record yet: UTM tags

The site deliberately strips everything after `?` from page addresses before sending them to Umami, so **UTM tags on ad links are thrown away**. Umami can show which platform a visitor came from, but not which ad or campaign.

**Developer task (small, do before paid ads):** in `src/lib/analytics/browser.ts`, page views are sent as the bare path, with `data-exclude-search="true"`. Change it so that, on tracked marketing pages only, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term` are kept and every other query parameter is still dropped. Then update the comment in `src/lib/analytics/paths.ts`, the `UMAMI_WEBSITE_ID` note in `docs/operations.md`, and the analytics tests. Once this is live, Umami's UTM report shows results per campaign and per ad.

**Tag every link like this** (lower case, hyphens, no spaces):

| Where | Example |
| --- | --- |
| Instagram ad | `?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch&utm_content=ad-video-9x16` |
| Facebook post | `?utm_source=facebook&utm_medium=social&utm_campaign=launch&utm_content=launch-film` |
| Pinterest pin | `?utm_source=pinterest&utm_medium=social&utm_campaign=designs&utm_content=velvet` |
| TikTok bio | `?utm_source=tiktok&utm_medium=social&utm_campaign=profile` |
| Google Search | Leave auto-tagging on; nothing to add |

### Where real results are

Visits aren't customers. Check these every week:

| Question | Where |
| --- | --- |
| How many couples signed up? | Supabase dashboard → Authentication → Users (ask the owner for access) |
| How many paid £39? | Stripe dashboard → Payments. **This is the number that matters.** |
| How much did each platform cost? | Meta Ads Manager, Google Ads, Pinterest and TikTok dashboards |
| Where did visitors come from? | Umami → Referrers (and UTM once the developer task is done) |

Work out **ad spend ÷ paying couples** for each platform. Each couple pays £39, so aim to spend well under that per paying couple. For example, keep spending on anything under about £15 and pause anything over £30.

### Ad-platform tracking pixels: not installed, on purpose

The Meta Pixel, Google tag and TikTok Pixel **aren't** on the site. They set cookies, which under UK law would need a cookie-consent banner, and the site is deliberately cookieless for visitors. So Meta and Google can't see sign-ups themselves: run ads optimised for **traffic or landing-page views**, and judge them with the Stripe numbers above. Adding pixels later is a product decision for the owner, not something to add quietly.

## 5. A sensible order for the first six weeks

| Week | Organic (free) | Paid |
| --- | --- | --- |
| 1 | Set up all accounts. Post the Instagram Reel and "Twelve designs" carousel; post the launch film on Facebook; start Pinterest (1–2 pins a day) | Google **Search** at about £5–10 a day (see `channels/google-ads`) |
| 2 | "Save the date first" carousel, the price post, the Stories set | Review Search: pause keywords that get clicks but no sign-ups |
| 3–4 | "RSVPs" carousel, remaining feed posts, TikTok video | Once the licence is confirmed: Meta video ads at about £5–10 a day (9:16 + 4:5 in one ad) |
| 5–6 | Keep Pinterest going. Repost the best performer | Put more budget into whatever has the lowest cost per paying couple and stop the rest. Consider Performance Max |

**Timing:** many couples get engaged over Christmas and New Year, and Save the Dates usually go out 6–12 months before the wedding. Plan the biggest spend for **late December to March**, and keep a smaller budget running the rest of the year.

**Audience:** couples planning a wedding in the UK and Ireland. The price is always shown in **GBP**, including to Irish couples.

## 6. What we can and can't say

The full list is in section 9 of the [features guide](marketing-context/marketing-docs/app-features-and-screenshots-guide.md#9-what-we-can-and-cant-say). The short version:

- **Use the approved lines**, e.g. "Your wedding website, beautifully done.", "RSVPs without the spreadsheet chaos.", "Save the date first. Invite them later.", "Free to build and preview. £39 once when you're ready to publish."
- **Never claim:** plus-ones or group RSVPs, guests editing their replies, reminders or emails to guests, QR codes, custom domains, gift lists, photo galleries, seating plans, "password-protected", "only invited guests can see it", an app, or "forever".
- **No testimonials, reviews or customer numbers** until real ones exist, with permission. Olivia & James and their guests are fictional; the images are labelled "Example wedding · fictional names".
- **Price:** "£39, paid once". No discounts or offers unless the owner approves them. Refunds: "Full refund within 14 days of paying, for any reason."
- Use British English.

## 7. Brand basics

- **Colours:** navy `#0B2A3D`, deep teal `#0F4C5C`, sage `#2F6B4F`, warm off-white `#F8F6F0`, soft blue `#EAF2F6`
- **Type:** Georgia for headings, Arial for everything else, and Cormorant Garamond italic for small accents (as in the videos)
- **Name:** "SaveTheDates", one word with capitals, tagline "For your next chapter"
- **Logo files:** `channels/google-ads/logos/` (square and landscape, navy and white) and the profile pictures in each channel folder

## 8. Changing the materials

Don't edit the exported images or videos by hand. Change the copy or layout in `source/` and regenerate, so every size stays consistent. [source/README.md](source/README.md) has the steps. If the product changes, ask the developer to re-capture the screenshots first (features guide, section 11), then regenerate everything.
