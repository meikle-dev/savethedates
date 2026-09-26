import type { Wedding } from "@/features/weddings/wedding";
import type { WeddingTheme } from "@/features/weddings/themes";
import { emptyDetails, type WeddingDetailsPage } from "@/features/weddings/details";
import type { InvitationPage } from "@/features/weddings/invitation";
import type { MealMenu } from "@/features/weddings/meal-menu";
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

/** F068: the fictional sample menu on the example RSVP pages, behind the same "Joyfully accepts" reveal. */
export const exampleMealMenu: MealMenu = {
  starter: [
    { id: "00000000-0000-4000-8000-000000000001", label: "Leek and potato soup" },
    { id: "00000000-0000-4000-8000-000000000002", label: "Smoked salmon with wheaten bread" },
  ],
  main: [
    { id: "00000000-0000-4000-8000-000000000003", label: "Roast sirloin of beef" },
    { id: "00000000-0000-4000-8000-000000000004", label: "Pan-roasted hake with lemon butter" },
    { id: "00000000-0000-4000-8000-000000000005", label: "Wild mushroom risotto" },
  ],
  dessert: [
    { id: "00000000-0000-4000-8000-000000000006", label: "Sticky toffee pudding" },
    { id: "00000000-0000-4000-8000-000000000007", label: "Lemon posset with shortbread" },
  ],
};
