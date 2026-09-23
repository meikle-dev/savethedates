# SaveTheDates Product Overview

## Purpose

SaveTheDates is a simple service that allows couples to create a personalised wedding website for their guests.

The goal is to give couples an easy way to share the key information guests need before the wedding without relying on paper invitations, long message threads, or repeated questions.

Each wedding receives its own URL, for example:

```text
savethedates.co.uk/chloeandross
```

The guest-facing experience is intentionally simple and is built around three core features.

---

## 1. Save the Date Landing Page

Example:

```text
savethedates.co.uk/chloeandross
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
savethedates.co.uk/chloeandross/details
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
savethedates.co.uk/s/<private-secret>/chloeandross/rsvp
```

The RSVP feature allows guests to respond to their invitation online.

The couple shares one private RSVP link with everyone. Guests enter their own name and answer; only the couple can see saved responses. Guests contact the couple to correct an answer.

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
* choose their wedding URL
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
