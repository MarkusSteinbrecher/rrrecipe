import type { InstructionStep, Source } from "./types";

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function formatMinutes(minutes?: number): string {
  if (!minutes) return "Not set";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function formatTimer(seconds?: number): string {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function youtubeTimestampUrl(source: Source, seconds: number): string | undefined {
  if (source.media?.provider !== "youtube") return undefined;
  return `https://www.youtube.com/watch?v=${source.media.videoId}&t=${seconds}s`;
}

export function speakStep(step: InstructionStep): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(step.text));
}

export function textareaLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
