# Facebook

## What's here

| Folder | Use |
| --- | --- |
| `page-setup/` | Page cover photo (1640×924) and profile picture |
| `posts/` | 6 feed posts (1080×1350). The same images as Instagram |
| `videos/` | The 59-second launch film (16:9) and its thumbnail |
| `ads/images/feed-4x5/` | Feed ads, 1080×1350 |
| `ads/images/square-1080x1080/` | Square ads (right column, Marketplace, search) |
| `ads/images/landscape-1200x628/` | Link ads |
| `ads/images/stories-9x16/` | Stories and Reels ads, 1080×1920 |
| `ads/videos/` | 10-second ad at 9:16 and 4:5 |

For multi-image posts, use the carousels in `../instagram/feed-carousels/`. The same files work on Facebook.

## Set up the Page

1. **Cover photo:** `page-setup/cover-photo-1640x924.jpg`. Facebook crops the top and bottom on desktop; the headline and phones sit in the safe middle band.
2. **Profile picture:** `page-setup/profile-picture-1080.png`
3. **Intro:** `Your wedding website, beautifully done. Save the Date, invitation, details and RSVPs on one private wedding website. Free to build and preview, £19 once to publish.`
4. **Website:** `https://savethedates.co.uk` · **Email:** `hello@savethedates.co.uk` · **Category:** Wedding Planning Service (or Website).
5. **Button:** "Sign up" or "Learn more", linking to the website.

## First posts

1. **The launch film:** upload `videos/savethedates-launch-film-1080p.mp4` natively (not a YouTube link), with `savethedates-launch-film-1080p-poster.jpg` as the thumbnail. Pin it to the top of the Page.
   > Your wedding website, beautifully done. From Save the Date to final RSVP, in one of twelve designs. Free to build and preview, £19 once when you're ready to publish. savethedates.co.uk
2. **The "Twelve designs" carousel** from the Instagram folder.
3. **The feed posts in `posts/`**, one or two a week. The captions in the [Instagram README](../instagram/README.md#captions-paste-as-they-are) work here too; on Facebook, add the link `https://savethedates.co.uk` at the end.

**Wedding groups:** only post where the group rules allow business posts, and keep it to a helpful answer plus a link. Don't spam.

## Paid ads

Facebook and Instagram ads run from the same campaign in Meta Ads Manager. Follow the [Instagram ad steps](../instagram/README.md#paid-ads-meta-ads-manager) and add these Facebook-only sizes to the same ad:

- **Square** (`ads/images/square-1080x1080/`) for the right column, Marketplace and search results.
- **Landscape** (`ads/images/landscape-1200x628/`) if you run a link-click ad.

Use `utm_source=facebook` in the website URL.
