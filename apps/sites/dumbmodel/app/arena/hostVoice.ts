const HOST_VOICE_KEY = "arena-host-voice";

export function readHostVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(HOST_VOICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHostVoiceEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HOST_VOICE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function speakHostLine(text: string): void {
  if (typeof window === "undefined" || !readHostVoiceEnabled()) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}
