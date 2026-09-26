import type { Wedding } from "@/features/weddings/wedding";
import type { WeddingTheme } from "@/features/weddings/themes";
import { emptyDetails, type WeddingDetailsPage } from "@/features/weddings/details";
import type { InvitationPage } from "@/features/weddings/invitation";
// Deliberately public fictional content; never load examples from customer data.
export function exampleWedding(theme: WeddingTheme): Wedding {
  return { theme, names: ["Olivia", "James"], date: "2027-06-14", location: "Lake Como, Italy", message: "A day by the lake. A lifetime together. We can’t wait to celebrate with you.", image: { src: "/media/lake-como-editorial.webp", alt: "An imagined Italian lakeside villa, framed by olive branches and sunlit mountains." }, photoFraming: { [theme]: { saveTheDate: { x: 46, y: 52, zoom: 1.05 }, details: { x: 54, y: 58, zoom: 1.1 } } } };
}
export function exampleDetails(theme: WeddingTheme): WeddingDetailsPage {
  return { ...emptyDetails, theme, first_name: "Olivia", second_name: "James", details_enabled: true, ceremony_time: "3:00 pm", ceremony_venue: "The lakeside garden", ceremony_address: "Villa dei Fiori, Lake Como (fictional venue)", reception_time: "5:00 pm onwards", reception_venue: "Dinner on the terrace", travel: "Please arrive by 2:30 pm. A shuttle will take guests from the village square to the venue.", accommodation: "We suggest staying in the village so you can enjoy the weekend by the lake.", dress_code: "Summer formal. Bring a light layer for the evening.", faqs: [{ question: "How do I RSVP?", answer: "Use the private guest link sent by the couple. This fictional example does not collect responses." }] };
}
export function exampleInvitation(theme: WeddingTheme): InvitationPage {
  const details = exampleDetails(theme);
  return { theme, first_name: "Olivia", second_name: "James", wedding_date: exampleWedding(theme).date, location: exampleWedding(theme).location,
    invitation_host_line: "Together with their families", invitation_wording: "", invitation_afterwards: "followed by dinner and dancing by the water",
    ceremony_time: details.ceremony_time, ceremony_venue: details.ceremony_venue, ceremony_address: details.ceremony_address };
}

/** A fixed, fictional closing date for the example RSVP and the invitation's reply line. */
export const exampleRsvpClosesOn = "2027-05-01";
