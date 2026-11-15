export type LunaTurn = { role: "user" | "luna"; text: string };

const THREAD = "luna-thread";
const INVITE = "luna-invite";
export const LUNA_INVITE = "luna-invite";

export function saveLunaThread(turns: LunaTurn[]) {
  sessionStorage.setItem(THREAD, JSON.stringify(turns));
  sessionStorage.setItem(INVITE, "1");
  window.dispatchEvent(new Event(LUNA_INVITE));
}

export function loadLunaThread(): LunaTurn[] {
  try {
    const raw = sessionStorage.getItem(THREAD);
    const parsed = raw ? (JSON.parse(raw) as LunaTurn[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((turn) => turn && (turn.role === "user" || turn.role === "luna") && typeof turn.text === "string");
  } catch {
    return [];
  }
}

export function lunaInvited() {
  return sessionStorage.getItem(INVITE) === "1";
}
