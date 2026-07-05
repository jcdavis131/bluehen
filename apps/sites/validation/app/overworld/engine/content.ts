/**
 * Static in-world copy (Spec 0033 V0 §2): measured lab voice, with warmth.
 * Signs describe real districts; only the happenings board and worldbook
 * terminals render live data (fetched client-side, never faked here).
 */

export const INTRO_LINES: readonly string[] = [
  "You've stepped into the Overworld — a small, honest map of the Blue Hen universe.",
  "Your visit is counted anonymously — that's it.",
  "Walk with the arrows or WASD. Face a sign, terminal, or door and press Space (or A) to look closer.",
];

export type SignText = { title: string; body: string };

export const SIGN_TEXT: Record<string, SignText> = {
  "sign-storefront": {
    title: "Storefront Plaza",
    body:
      "The public face of Blue Hen RE — bhenre.com. Where the retrieval engine meets " +
      "customers, and the happenings board keeps a running account of what actually shipped.",
  },
  "sign-dumbmodel": {
    title: "DumbModel Arcade",
    body:
      "Two cabinets, two honest games. Beat the Baseline pits you against a real dumb " +
      "model; Rank Arena asks you to out-guess the live ranking. Nothing here is scripted — " +
      "every round hits the same engine the fleet runs on.",
  },
  "sign-refinery": {
    title: "Refinery Works",
    body:
      "The Data Refinery — data.bhenre.com. Datasets are harvested, chunked, and card-" +
      "documented here before anything downstream ever sees them.",
  },
  "sign-signals": {
    title: "Signals Garden",
    body:
      "Simulation only. Nothing grown here trades on real capital — signals.bhenre.com " +
      "is a contained sandbox, and every reading in this garden is fixture data, labeled as such.",
  },
  "sign-library": {
    title: "Research Library",
    body:
      "The library is quiet today. Applied Research (arxiviq.com) keeps its own hours — " +
      "check the terminal inside for what's actually on record.",
  },
};

export const DOOR_TEXT: Record<string, SignText> = {
  "door-hq": {
    title: "Headquarters Tower",
    body: "The tower door is sealed from the outside. Whatever runs Blue Hen RE happens up there.",
  },
  "door-refinery": {
    title: "Refinery Works",
    body: "Locked for harvest hours. The dataset catalog it feeds is public at data.bhenre.com.",
  },
  "door-library": {
    title: "Research Library",
    body: "Closed for now — the terminal out front still has the worldbook, though.",
  },
};

/** The Courthouse door is the one exit that leaves the game entirely,
 * on the same site (slasso.com/verdict). */
export const COURTHOUSE_LINK = {
  title: "The Courthouse",
  body: "Order in the lab. Step inside to judge a real retrieval pair yourself.",
  href: "/verdict",
  label: "Enter the Courthouse →",
};

export type CabinetLink = { title: string; body: string; href: string; label: string };

export const CABINET_TEXT: Record<string, CabinetLink> = {
  "cabinet-beat": {
    title: "Beat the Baseline",
    body: "Play? Race a real dumb model on a real query — see who retrieves better.",
    href: "https://dumbmodel.com/beat",
    label: "Play Beat the Baseline →",
  },
  "cabinet-arena": {
    title: "Rank Arena",
    body: "Play? Out-guess the live ranking, one head-to-head match at a time.",
    href: "https://dumbmodel.com/arena",
    label: "Play Rank Arena →",
  },
};

export const WIKI_BASE_URL = "https://data.bhenre.com/wiki";

export const KIOSK_TITLE: Record<string, string> = {
  "kiosk-hq": "HQ Worldbook Terminal",
  "kiosk-library": "Library Worldbook Terminal",
};

export const BOARD_TITLE = "Happenings Board";
export const BOARD_EMPTY_LINE = "The board is bare today.";
