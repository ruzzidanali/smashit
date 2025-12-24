export function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function fmtRange(start: number, end: number) {
  return `${fmtMinutes(start)} – ${fmtMinutes(end)}`;
}
