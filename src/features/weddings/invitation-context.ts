export const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function sharedRsvpHref(slug: string, secret: string) {
  return `/s/${secret}/${slug}/rsvp`;
}

export function sharedSecretFromSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" && invitationTokenPattern.test(value) ? value : null;
}

export function weddingJourneyHrefs(slug: string, sharedSecret?: string | null) {
  const context = sharedSecret ? `?share=${encodeURIComponent(sharedSecret)}` : "";
  return {
    home: `/${slug}${context}`,
    details: `/${slug}/details${context}`,
    rsvp: sharedSecret ? sharedRsvpHref(slug, sharedSecret) : `/${slug}/rsvp${context}`,
  };
}
