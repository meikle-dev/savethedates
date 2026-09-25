# SaveTheDates Product Overview

## Purpose

SaveTheDates is a simple service that allows couples to create a personalised wedding website for their guests.

The goal is to give couples an easy way to share the key information guests need before the wedding without relying on paper invitations, long message threads, or repeated questions.

Each wedding receives one private guest link, for example:

```text
savethedates.co.uk/chloeandross/<guest-secret>
```

The long secret makes every link unique and unguessable. Guests open the link rather than type it. The couple chooses the readable names part at the start, which doesn't need to be unique and can be changed at any time.

The guest-facing experience is intentionally simple and is built around three core features.

---

## 1. Save the Date Landing Page

Example:

```text
savethedates.co.uk/chloeandross/<guest-secret>
```

This is the main page guests see when the couple first shares their wedding website.

Its purpose is to announce the wedding and give guests the essential information needed to save the date.

Typical content includes:

* couple's names
* wedding date
* location
* hero image or engagement photo
* short message
* links to further information when available

This should be the **first feature built** and forms the foundation of every wedding website.

---

## 2. Wedding Details

Example:

```text
savethedates.co.uk/chloeandross/<guest-secret>/details
```

The Details page provides guests with practical information about the wedding.

Its purpose is to reduce the need for couples to repeatedly answer common questions.

Information may include:

* ceremony location
* reception location
* timings
* directions
* parking
* transport
* accommodation
* dress code
* food and drink information
* FAQs
* other useful guest information

The couple should be able to publish only the information relevant to their wedding.

---

## 3. RSVP

Example:

```text
savethedates.co.uk/chloeandross/<guest-secret>/rsvp
```

The RSVP feature allows guests to respond to their invitation online.

The couple shares one private guest link with everyone, and guests reply on its RSVP page. Guests enter their own name and answer; only the couple can see saved responses. Guests contact the couple to correct an answer.

Its main purpose is to make RSVP collection easier for both the couple and their guests.

At a basic level, guests should be able to:

* identify themselves
* confirm whether they are attending
* provide requested guest information
* submit their response

Over time this feature may also support information such as:

* dietary requirements
* meal choices
* plus ones
* additional guest questions

RSVP management is a distinct product feature and should remain separate from the general wedding Details page.

---

## Core Guest Experience

The guest journey should remain intentionally simple:

```text
Save the Date
      ↓
Wedding Details
      ↓
RSVP
```

Guests should not need to create accounts or learn how to use the platform.

The experience should feel like visiting a simple, elegant wedding website rather than using a complex application.

---

## Couple Experience

Behind the guest-facing website, couples need a simple way to configure and manage their wedding.

At a high level they will need to be able to:

* create their wedding
* choose the readable names part of their guest link
* provide landing-page content
* add wedding details
* configure RSVP
* view submitted RSVPs
* update information when required

This management experience supports the three core guest-facing features but is not itself the main product being sold.

---

## Product Scope

The core SaveTheDates product is therefore:

```text
Wedding Website
│
├── Landing Page
│
├── Details
│
└── RSVP
```

Everything else should initially be considered supporting functionality.

The product should avoid becoming a full wedding-planning platform unless customer demand clearly justifies expanding in that direction.

The main value proposition is simple:

> Give couples an easy way to create a beautiful wedding website where guests can save the date, find the information they need, and RSVP.

## 24 September walkthrough decisions (pending implementation)

Delivery status and acceptance criteria are in [F042-F050](../backlog.md#24-september-walkthrough-assessment).

- **One guest link.** Every guest page sits under the wedding's secret, with the names first: `/<names>/<guest-secret>`, `/details` and `/rsvp` (F043). There is no second, general URL. The workspace calls this link **Your guest link** (F042).
- **What the link allows.** Anyone holding it can view the published site and reply. It does not verify identity, and it doesn't let anyone read other guests' answers. Replacing the link stops every previously shared copy from working.
- **The names part.** It is decorative. It isn't unique, can be chosen before paying and can be changed later; an outdated names part redirects to the current one.
- **One reply per person.** Confirmed by the owner on 24 September: each guest fills in the RSVP themselves, with clear guidance and a deliberate way to reply for another person. Household counts, notes and dietary questions remain deferred, and the clarity fixes collect no extra personal data.
- **Owner choices stay explicit.** Details visibility and RSVP acceptance are both off initially.
- **Sharing.** Couples get an editable, pre-written share message with WhatsApp and native share buttons (F042). Link previews show the couple's names and date, never the photo or location (F047).
- **Deferred.** Calendar downloads, QR codes and photos in link previews.
- **Data rights.** Customer data export and deletion are the approved lifecycle in F048, separate from optional catering exports.
