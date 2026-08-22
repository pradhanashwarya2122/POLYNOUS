// Personalisation engine — turns the user's onboarding interest mix into
// tailored suggested questions for research, debate and search. Reads the
// cached interest keys (written at onboarding / Settings) and maps them to the
// sample questions in data/topics.js, each carrying a relevant icon + accent.

import { ALL_TOPICS, topicByKey } from "./data/topics";

export function getInterests() {
  try {
    const raw = localStorage.getItem("polynous_interests");
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function setInterests(keys) {
  try { localStorage.setItem("polynous_interests", JSON.stringify(keys || [])); } catch (_) {}
}

export function hasInterests() {
  return getInterests().length > 0;
}

function shuffle(arr) {
  const x = [...arr];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/**
 * Personalised suggestions.
 * @param {"research"|"debate"} mode
 * @param {number} n
 * @returns {{text,icon,accent,topic,name,personalized}[]}
 */
export function getPersonalizedSuggestions(mode = "research", n = 6) {
  const field = mode === "debate" ? "d" : "r";
  const keys = getInterests();
  const chosen = keys.map(topicByKey).filter(Boolean);
  const out = [];
  const push = (t, personalized) => {
    if (out.length >= n || out.some((o) => o.topic === t.key) || !t[field]) return;
    out.push({ text: t[field], icon: t.icon, accent: t.accent, topic: t.key, name: t.name, personalized });
  };
  // 1) the user's actual interests first
  shuffle(chosen).forEach((t) => push(t, true));
  // 2) top up with a diverse spread so the list is always full
  if (out.length < n) shuffle(ALL_TOPICS).forEach((t) => push(t, false));
  return out.slice(0, n);
}

/** Just the interest topic objects (for chips / labels). */
export function getInterestTopics() {
  return getInterests().map(topicByKey).filter(Boolean);
}
