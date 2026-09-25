import "@/app/app.css";
import { DevelopmentWeddingPage } from "@/features/weddings/development-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return <DevelopmentWeddingPage fixture="demo-long-names" />;
}
