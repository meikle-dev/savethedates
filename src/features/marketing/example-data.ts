import type { Wedding } from "@/features/weddings/wedding";
import type { WeddingTheme } from "@/features/weddings/themes";
import { emptyDetails, type WeddingDetailsPage } from "@/features/weddings/details";
// Deliberately public fictional content; never load examples from customer data.
export function exampleWedding(theme: WeddingTheme): Wedding {
  return { theme, names: ["Olivia", "James"], date: "2027-06-14", location: "Lake Como, Italy", message: "A day by the lake. A lifetime together. We can’t wait to celebrate with you.", image: { src: "/media/lake-como.webp", alt: "A quiet pier on Lake Como with mountains beyond." } };
}
export function exampleDetails(theme: WeddingTheme): WeddingDetailsPage {
  return { ...emptyDetails, theme, first_name: "Olivia", second_name: "James", details_enabled: true, ceremony_time: "3:00 pm", ceremony_venue: "The lakeside garden", ceremony_address: "Villa dei Fiori, Lake Como (fictional venue)", reception_time: "5:00 pm onwards", reception_venue: "Dinner on the terrace", travel: "Please arrive by 2:30 pm. A shuttle will take guests from the village square to the venue.", accommodation: "We suggest staying in the village so you can enjoy the weekend by the lake.", dress_code: "Summer formal. Bring a light layer for the evening.", faqs: [{ question: "How do I RSVP?", answer: "Use the private invitation link sent to you by the couple. This fictional example does not collect responses." }] };
}
