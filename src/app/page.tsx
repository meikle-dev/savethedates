import { MarketingHome } from "@/features/marketing/home";
import { homeMetadata } from "@/features/marketing/metadata";

export const dynamic = "force-dynamic";
export const generateMetadata = homeMetadata;

export default function Home() { return <MarketingHome />; }
