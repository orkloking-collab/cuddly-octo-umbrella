/**
 * 18+ verification, kept out of the AgeGate component so Fast Refresh can stay
 * on for the component file (a module that exports both a component and helpers
 * breaks HMR boundaries).
 */
const KEY = 'romancha_age_gate_v1';

export function ageFrom(dobMs) {
  const dob = new Date(dobMs);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function readAgeGate() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved?.passed || !Number.isFinite(saved.dob)) return null;
    const age = ageFrom(saved.dob);
    return age >= 18 ? { age, dob: saved.dob, at: saved.at || null } : null;
  } catch {
    return null;
  }
}

export function hasVerifiedAge() {
  return readAgeGate() !== null;
}

export function writeAgeGate(dobMs, age) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ passed: true, dob: dobMs, age, at: Date.now() }));
  } catch {
    /* private mode: the gate simply re-asks next load */
  }
}

export function clearAgeGate() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
