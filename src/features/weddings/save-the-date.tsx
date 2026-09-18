import { formatWeddingDate, type Wedding } from "./wedding";
import { WeddingPhoto } from "./wedding-photo";
import { WeddingNavigation } from "./wedding-navigation";

export function SaveTheDate({ wedding, homeHref = "/", detailsHref, rsvpHref }: { wedding: Wedding; homeHref?: string; detailsHref?: string; rsvpHref?: string }) {
  return (
    <div data-theme={wedding.theme ?? "minimal"} className="wedding-shell mx-auto min-h-svh max-w-[1100px]">
      <header className="px-6 pt-9 text-center md:pt-12">
        <p className="couple-names mx-auto max-w-3xl text-xs leading-loose font-medium uppercase md:text-sm">
          <span>{wedding.names[0]}</span><span className="mx-3 inline-block">&amp;</span><span>{wedding.names[1]}</span>
        </p>
        <WeddingNavigation homeHref={homeHref} detailsHref={detailsHref} rsvpHref={rsvpHref} current="home" />
      </header>
      <main id="main" className="text-center">
        <div className="wedding-announcement relative z-10 px-6 pt-10 md:pt-14">
          <h1 className="editorial text-[clamp(4rem,12vw,7.25rem)] leading-[0.94] tracking-[-0.055em]">
            Save<span className="block">the Date</span>
          </h1>
          <div className="mx-auto mt-7 mb-6 h-px w-11 bg-[var(--sage)] md:mt-9" aria-hidden="true" />
          <p className="editorial text-lg tracking-[0.18em] uppercase md:text-xl">
            <time dateTime={wedding.date}>{formatWeddingDate(wedding.date)}</time>
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed tracking-[0.2em] break-words uppercase md:text-sm">{wedding.location}</p>
          {wedding.message && <p className="editorial mx-auto mt-7 max-w-[28rem] text-lg leading-relaxed text-balance md:text-xl">{wedding.message}</p>}
        </div>
        <WeddingPhoto key={wedding.image?.src} image={wedding.image} />
      </main>
      <footer className="px-6 py-9 text-center md:py-10">
        <p className="editorial text-xl italic text-[var(--sage)]">With love,</p>
        <p className="editorial mt-2 text-lg break-words">{wedding.names.join(" & ")}</p>
        <svg className="mx-auto mt-5 h-5 w-5 text-[var(--sage)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <path d="M12 21 3.5 12.5C-3 5.5 6-1 12 6c6-7 15-.5 8.5 6.5Z" />
        </svg>
      </footer>
    </div>
  );
}
