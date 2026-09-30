# Pinterest

Couples plan weddings on Pinterest, and pins keep getting found for months, so this is likely the best free channel. All pins are 1000×1500 (2:3), Pinterest's recommended size.

## Strategy: use the words couples search for

Pinterest works like a visual search engine. It decides who sees a pin from its title, description, board name and topic tags. Couples search for **save the dates and invitations in a look they love**. They rarely search for "wedding websites". So:

- **Lead with the need and the look:** "Burgundy winter wedding invitation and save the date", "Navy and gold wedding invitation". Keep "digital", "online RSVP" and "wedding website" as supporting words.
- **Main searches** (from Pinterest's UK search suggestions, 28 Sep 2026): save the date ideas and designs, wedding invitation ideas and designs, digital save the date, wedding invitations digital, and wedding RSVP ideas and online. A smaller second strand is wedding website ideas, design and examples.
- **Style searches exist for every design:**

| Design | Style search |
| --- | --- |
| Modern Minimal | sage green, minimalist wedding invitations |
| Warm & Romantic | romantic, blush wedding invitations |
| Modern & Bold | modern wedding invitations |
| Terracotta | terracotta, Mediterranean wedding invitations |
| Heather | lilac, Scottish, Irish wedding invitations |
| Coastal | beach, coastal wedding invitations |
| Riviera | Italian, lemon, Amalfi wedding invitations |
| Alcantara | brown wedding invitations |
| Countryside | country, autumn wedding invitations |
| Velvet | burgundy, winter wedding invitations |
| Black Tie | black and white, black tie wedding invitations |
| Evening Gold | navy and gold wedding invitations |

- **Keep the pictures as they are.** Each shows a finished Save the Date in a clear style, which is what people save.
- **Next content idea:** "save the date wording ideas" and "when to send save the dates" are big searches. They need a helpful guide page on the site first, which is SEO & Growth work.

## Status (29 September 2026)

- **Invitation set added (29 Sep, evening):** 12 new pins, one per design, each showing that design's **wedding invitation** on a light paper background (`pins/invitations/`, made by `T.invDesign` in `source/statics.html`). They're on a new board, **"Wedding invitation ideas"**, tagged "Wedding Invitations", and scheduled daily at **12:00 UK** from 30 Sep to 11 Oct. Together with the 8pm set, that's two pins a day until 11 Oct. Each links to the design's example invitation, `/examples/<slug>/invitation`, with `utm_campaign=invitations&utm_content=<slug>`. The profile showed 28 scheduled pins afterwards. The images include the small illustrated botanicals from the designs; under the marketer rules they aren't labelled as AI (illustrations, not realistic imagery).

| Date (12:00) | Invitation pin | Title |
| --- | --- | --- |
| 30 Sep | Velvet | Burgundy and gold wedding invitation for a winter wedding, digital with RSVP |
| 1 Oct | Countryside | Country wedding invitation in green tweed, rustic autumn style, digital |
| 2 Oct | Evening Gold | Navy and gold wedding invitation for an elegant evening wedding, digital |
| 3 Oct | Modern Minimal | Sage green minimalist wedding invitation, digital with online RSVP |
| 4 Oct | Warm & Romantic | Blush and cream romantic wedding invitation, digital with online RSVP |
| 5 Oct | Heather | Lilac heather wedding invitation for a Scottish or Irish wedding |
| 6 Oct | Riviera | Lemon wedding invitation with Riviera blue stripes, Italian Amalfi style |
| 7 Oct | Black Tie | Black tie wedding invitation, black and white formal letterpress style |
| 8 Oct | Terracotta | Terracotta wedding invitation with olive branches, Mediterranean style |
| 9 Oct | Coastal | Coastal beach wedding invitation in sea glass blue, digital with RSVP |
| 10 Oct | Alcantara | Brown and cognac wedding invitation, elegant and modern, digital with RSVP |
| 11 Oct | Modern & Bold | Modern wedding invitation in deep teal, editorial style, digital with RSVP |

- **Next batch, due before 15 Oct:** nothing is scheduled after 15 Oct. Candidates: RSVP-page pins per design ("wedding RSVP ideas"), Details-page pins, and wording pins once F077 exists. See the [traffic plan](../../traffic-plan.md).

- **Price change to £19 (29 Sep):**
  - Every pin description now says £19: all 16 scheduled pins and the 2 live pins. The profile's about text says £19 too. Each one was checked after a reload.
  - The old `06-price-39-once` scheduled pin was deleted. It was replaced by `06-price-19-once`: same title (now £19), description, board and 12 Oct 8pm slot, with the link's `utm_content=price-19-once`.
  - Schedule dates are unchanged.

- **Account:** the owner's personal account, converted to a free business account with the owner's approval. The profile is `pinterest.com/savethedatesuk`, named "SaveTheDates", with the logo, the about text and the website. Business type is "Online merchant or marketplace", focus Events, and ads interest "not sure yet". The ads-sales contact form was skipped.
- **Website claimed** on 28 Sep 2026 using a GoDaddy DNS TXT record: `@` = `pinterest-site-verification=d87482f0924eeb82078895e4c217c3c1`. Keep this record. The Pinterest tag was **not** installed, because the site is deliberately cookieless.
- **Boards** (public; all have keyword-rich descriptions):
  - **Save the date and wedding invitation ideas:** the 12 design pins and "Twelve designs".
  - **Digital save the dates:** the hero, "Save the date first" and "Simple to share".
  - **Wedding RSVPs and planning:** RSVPs and price.
  - "Wedding website designs" is now empty and set to secret; it's kept, not deleted.
  - Pinterest refused to rename boards (server error 12 every time, on 28 Sep). That's why a new board was created. Retry later to rename "Digital save the dates" to "Digital save the date ideas" and "Wedding RSVPs and planning" to "Wedding RSVP ideas and planning".
- **Pins:** all 18 were retitled on 28 Sep for the searches above (titles in the table below). Links are unchanged: every link has `utm_source=pinterest&utm_medium=social`, plus `utm_campaign=designs|topics` and `utm_content=<slug>`. There's no AI label, because none of the pins shows the botanical artwork.
  - **Live:** the hero and Modern Minimal.
  - **Scheduled one a day at 8pm UK:** 29 Sep to 15 Oct (dates below).
- **Still to do:**
  1. **Video pin:** Chrome wouldn't load the video in a background tab. Post it from the Pinterest app or a tab in front, onto "Digital save the dates", linking to the homepage.
  2. **Retry the two board renames** above.
  3. **From about 16 Oct:** check Analytics for the most-saved designs, and repin or make fresh pins of those.

## What's here

| Folder | Use |
| --- | --- |
| `pins/designs/` | One pin per design (12) |
| `pins/invitations/` | One invitation pin per design (12), scheduled at 12:00 |
| `pins/topics/` | 6 pins: hero, twelve designs, RSVPs, save the date first, sharing, price |
| `video-pins/` | The 10-second vertical video and its cover |
| `profile/` | Profile picture |

## Pinning

Spread pins out over two to three weeks (one or two a day) rather than posting everything at once. Pinterest's "Publish at a later date" option can schedule pins up to about 30 days ahead.

**Design pins:** link each one to its own example page, `https://savethedates.co.uk/examples/<slug>`. The slugs are `minimal`, `romantic`, `bold`, `terracotta`, `heather`, `coastal`, `riviera`, `alcantara`, `countryside`, `velvet`, `black-tie` and `evening-gold`. Build the description in this order:
1. The design's official line from the [features guide](../../marketing-context/marketing-docs/app-features-and-screenshots-guide.md#31-twelve-designs-one-look-from-start-to-finish-lead-feature).
2. One sentence with the style search terms.
3. "Your Save the Date, wedding invitation, details and online RSVP all match, on one wedding website. Send by WhatsApp, text or email. Try it free with your own words and photo; £19 once to publish. Example wedding with fictional names."

| Date | Pin | Title |
| --- | --- | --- |
| Live | Modern Minimal | Sage green minimalist wedding invitation and digital save the date |
| 29 Sep | Velvet | Burgundy winter wedding invitation and save the date, digital with RSVP |
| 1 Oct | Warm & Romantic | Romantic blush and cream wedding invitation and digital save the date |
| 3 Oct | Heather | Lilac Scottish or Irish wedding save the date and invitation, digital |
| 5 Oct | Coastal | Beach and coastal wedding invitation and digital save the date with RSVP |
| 7 Oct | Terracotta | Terracotta Mediterranean wedding invitation and digital save the date |
| 8 Oct | Countryside | Country wedding invitation and save the date in green tweed, digital |
| 10 Oct | Riviera | Italian lemon wedding invitation and save the date, Amalfi style, digital |
| 11 Oct | Black Tie | Black and white black tie wedding invitation and digital save the date |
| 13 Oct | Evening Gold | Navy and gold wedding invitation and digital save the date with RSVP |
| 14 Oct | Alcantara | Brown and cognac wedding invitation and digital save the date, elegant |
| 15 Oct | Modern & Bold | Modern wedding invitation and save the date in deep teal, digital |

**Topic pins:**

| Date | Pin | Title | Link |
| --- | --- | --- | --- |
| Live | `01-your-wedding-website` | Wedding website with digital save the date, invitation and online RSVP | `/` |
| 30 Sep | `04-save-the-date-first` | Digital save the date ideas: save the date first, invite them later | `/digital-save-the-date` |
| 2 Oct | `02-twelve-designs` | 12 save the date and wedding invitation designs. Which one's you? | `/#themes` |
| 6 Oct | `03-rsvps-with-meal-choices` | Online wedding RSVP with meal choices and dietary requirements | `/what-we-offer` |
| 9 Oct | `05-simple-to-share` | Digital save the date you can send by WhatsApp, text or email | `/digital-save-the-date` |
| 12 Oct | `06-price-19-once` (replaced 29 Sep) | Digital save the date, wedding invitation and RSVP website: £19 once | `/#pricing` |

**Video pin:** `video-pins/savethedates-ad-9x16-10s.mp4`, with `savethedates-ad-9x16-10s-cover.jpg` as the cover, linking to the homepage.

## Paid (later)

Pinterest ads can promote the best-performing pins. Wait until organic pins show which designs get saved most.
