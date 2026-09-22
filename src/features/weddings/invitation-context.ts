export const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function invitationTokenFromSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" && invitationTokenPattern.test(value) ? value : null;
}

export function weddingJourneyHrefs(slug: string, token: string | null) {
  const context = token ? `?invite=${encodeURIComponent(token)}` : "";
  return {
    home: `/${slug}${context}`,
    details: `/${slug}/details${context}`,
    rsvp: `/${slug}/rsvp${context}`,
  };
}
