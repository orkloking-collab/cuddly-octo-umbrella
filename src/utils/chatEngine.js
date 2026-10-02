/**
 * Conversation engine for demo matches.
 *
 * Real dating apps have real humans on the other end; this prototype cannot.
 * Instead of a canned "haha nice" bot, each reply is assembled from the
 * *match's own profile* (their prompts, interests, city, job) so threads read
 * like the person you swiped on, and the guardrail layer handles the parts a
 * real product must handle: harassment, minors, sextortion and "let's meet".
 */

import { seededUnit } from './matching.js';

const LOW_EFFORT = /^(hi|hii|hiii|hey|heyy|hello|yo|sup|wyd|kemon acho|\?+|👍|❤️+)\.?$/i;

const INTENTS = [
  // Safety intents are checked first: "you are a stupid idiot" starts with "yo"
  // and used to be classified as a greeting.
  { id: 'harassment', test: /\b(shut up|stupid|ugly|idiot|moron|hate you|loser|creep|pervert|harass)\b/i },
  { id: 'money', test: /\b(send money|send \d+|bkash|nagad|rocket|cashapp|paypal|gift card|crypto|investment|token|loan|otp)\b/i },
  { id: 'explicit', test: /\b(nude|nudes|sexy|strip|without clothes|show (me )?(your|u)|only fans|hookup tonight)\b/i },
  { id: 'age', test: /\b(how old are you|your age|are you 1[0-7]\b|school (student|girl|boy)|minor)\b/i },
  { id: 'greeting', test: /^(hi|hii|hiii|hey|heyy|hello|yo|yo{2,}|salaam|salam|assalamu|good (morning|evening|night))\b/i },
  { id: 'howAreYou', test: /how are you|how's it going|hows your day|kemon acho|you ok|how you doing/i },
  { id: 'meetup', test: /\b(meet|coffee|dinner|date out|hang out|meet up|see you|out tonight|this weekend)\b/i },
  { id: 'photos', test: /\b(photo|pic|picture|selfie|your face)\b/i },
  { id: 'location', test: /\b(where are you|from where|which (area|city)|where do you (live|stay)|based)\b/i },
  { id: 'work', test: /\b(job|work|study|studying|office|company|profession|career)\b/i },
  { id: 'interest', test: /\b(like|love|hobby|hobbies|music|film|movie|book|food|travel|sport|cricket|read)\b/i },
  { id: 'romantic', test: /\b(beautiful|gorgeous|cute|attracted|marriage|wife|husband|love you)\b/i },
  { id: 'bye', test: /\b(bye|goodnight|gtg|gotta go|talk later|sleep)\b/i },
];

function detectIntent(text) {
  const raw = String(text || '');
  if (LOW_EFFORT.test(raw.trim())) return 'lowEffort';
  const found = INTENTS.find((i) => i.test.test(raw));
  return found ? found.id : 'openers';
}

const pick = (seed, arr) => arr[Math.floor(seededUnit(seed) * arr.length) % arr.length];

function sharedTopics(me, them) {
  const mine = new Set((me?.interests || []).map((i) => String(i).toLowerCase()));
  return (them?.interests || []).filter((i) => mine.has(String(i).toLowerCase()));
}

/**
 * Generate a reply. Returns:
 *  { kind: 'reply', text, delayMs }        — normal response
 *  { kind: 'guardrail', code, text }       — safety intervention instead of a reply
 *  { kind: 'silence', reason }             — this person does not reply (realistic)
 */
export function replyTo(incoming, me, them, turn = 0) {
  const intent = detectIntent(incoming);
  const seed = `${them?.id}:${intent}:${turn}:${Math.floor(Date.now() / 60000)}`;
  const shared = sharedTopics(me, them);

  if (intent === 'harassment') {
    return {
      kind: 'guardrail',
      code: 'harassment',
      text: `I'm not going to keep chatting after that. Please keep it respectful — I'm reporting this conversation.`,
      action: { label: 'Report & block', toast: 'Reported to Romancha Trust & Safety. This person can no longer see or message you.' },
    };
  }
  if (intent === 'money') {
    return {
      kind: 'guardrail',
      code: 'scam',
      text: `Nope — I never send or request money on a first conversation. If anyone asks you for that, use Report.`,
      action: { label: 'Report scam', toast: 'Thanks. Scam reports go straight to review; this chat is now blocked.' },
    };
  }
  if (intent === 'explicit') {
    return {
      kind: 'guardrail',
      code: 'boundary',
      text: `Let's slow down 🙂 I'm here to actually get to know someone. Ask me something about ${pick(seed, them?.interests || ['this city'])} instead.`,
    };
  }
  if (intent === 'age') {
    return {
      kind: 'guardrail',
      code: 'age',
      text: `I'm ${them?.age ?? 'over 18'} and everyone on Romancha has to be 18+ with photo verification. If you're under 18, you should leave the app now.`,
    };
  }

  // Realism: a chunk of matches go quiet, especially after a low-effort opener.
  const flakeChance = intent === 'lowEffort' ? 0.45 : 0.12;
  if (seededUnit(`${seed}:flake`) < flakeChance && turn > 0) {
    return { kind: 'silence', reason: 'read-but-no-reply' };
  }

  const openers = them?.openers?.length ? them.openers : ['So — what made you download this?'];
  const blocks = [];

  switch (intent) {
    case 'lowEffort':
      blocks.push(pick(seed, [
        'Ha, bold opening 😄 Okay your turn: ask me something real.',
        'I survived on "hi" exactly once. Try me with a question 🙂',
        `Two words isn't much, but I'm here — ${them?.city ? `how's your week in ${them.city} going?` : 'how is your week going?'}`,
      ]));
      break;
    case 'greeting':
      blocks.push(pick(seed, [
        `Hey ${me?.name ? me.name.split(' ')[0] : 'you'} 🙂 Your profile made me laugh at the wrong moment in public, so thanks for that.`,
        'Hi! Okay, I looked at your prompts before swiping, which I never do. That is a warning sign for me.',
        `Hey 👋 I'm ${them?.name?.split(' ')[0] || 'here'} — currently ${them?.online ? 'supposedly working' : 'avoiding my responsibilities'}.`,
      ]));
      break;
    case 'howAreYou':
      blocks.push(pick(seed, [
        them?.job ? `Honestly fine — ${them.job.toLowerCase()} brain is half off, but I'm up.` : 'Honestly fine. Long day, decent coffee.',
        'Better now, weirdly. What about you — actual answer or polite answer?',
        `I'm good! Just ${shared[0] ? `came back from ${shared[0].toLowerCase()}` : 'walked out of work'}. You?`,
      ]));
      break;
    case 'meetup':
      blocks.push(
        pick(seed, [
          `I'd like that. Somewhere public and loud enough that we can't overhear each other — ${them?.city || 'town'} has that in bulk.`,
          'Yes, but daytime first and I tell a friend where I am. Non-negotiable, not an insult 🙂',
          `Coffee beats dinner for a first one — cheaper to leave if we hate it, better to stay if we don't.`,
        ]),
        'When are you free? I can do a weekday evening or Sunday morning.',
      );
      break;
    case 'photos':
      blocks.push(pick(seed, [
        'You have my second photo, which is the most honest one on there. Ask me for a real one after a few messages 🙂',
        'No thirst pics, sorry — that is a house rule for both of us. But I will describe what I look like on a bad hair day: tragic.',
        `One travel photo is coming if you tell me your worst travel disaster. Fair trade.`,
      ]));
      break;
    case 'location':
      blocks.push(
        them?.city ? `I'm in ${them.city}${them.country ? `, ${them.country}` : ''} — ${them?.job ? `mostly around work, ${them.job.toLowerCase()} keeps me on the move` : 'mostly around the usual cafés'}.` : 'Local! You?',
        'Where do you actually hang out though, not just where you live?',
      );
      break;
    case 'work':
      blocks.push(
        them?.job ? `${them.job}${them.org ? ` at ${them.org}` : ''}. Meaning I get asked "so what do you actually do" at every party.` : 'Work is fine. Yours more interesting than mine, I can tell.',
        'Payroll by day, unreasonable opinions by night. What do you do?',
      );
      break;
    case 'interest': {
      const topic = shared[0] || them?.interests?.[0] || 'films';
      blocks.push(
        them?.prompts?.[0]
          ? `My whole stance is on my profile: "${them.prompts[0].a}" — I will die on that hill.`
          : `${topic}? Okay, we need to sort this out properly: beginner level or already annoying about it?`,
      );
      if (shared.length > 1) blocks.push(`Also — ${shared[1]} on your profile. That's twice now. Suspicious overlap.`);
      break;
    }
    case 'romantic':
      blocks.push(pick(seed, [
        'Flattery noted, but earn it a bit first 🙂 Tell me something true about you.',
        'I like you too, in the "we have exchanged exactly four messages" way. Let us keep going.',
        'Careful, that works on people who have not been online before. It is working a little. Not enough.',
      ]));
      break;
    case 'bye':
      blocks.push(pick(seed, [
        'Go rest 🙂 Text me the thing you were about to tell me, tomorrow.',
        'Night! Ask me one question before you sleep so I have something to think about.',
        'Okay, bye — I am keeping this thread so you cannot pretend you never met me.',
      ]));
      break;
    default:
      blocks.push(pick(seed, [
        'That is a genuinely interesting thing to say out of nowhere. Keep going.',
        'Wait, say more. I have opinions now.',
        `${them?.name?.split(' ')[0] || 'I'} agrees, which is dangerous. What else?`,
      ]));
  }

  // Occasionally throw in their own icebreaker to keep the ball in their court.
  if (turn % 3 === 2) blocks.push(pick(seed, openers));

  const text = blocks.filter(Boolean).join('\n\n');
  const words = text.split(/\s+/).length;
  return { kind: 'reply', text, delayMs: Math.min(9000, 1100 + words * 110 + Math.floor(seededUnit(`${seed}:lat`) * 1800)) };
}

/** What the other person says first, right after a match (about 60% of the time). */
export function matchOpener(them, me) {
  const seed = `${them?.id}:opener:${me?.id || 'guest'}`;
  if (seededUnit(`${seed}:will`) < 0.62) return null;
  const line = them?.prompts?.[0]
    ? pick(seed, [
        `Okay I have to ask about "${them.prompts[0].q}" — is that a real thing you do?`,
        `Your profile said "${them.prompts[0].a}". Bold. Explain.`,
      ])
    : pick(seed, them?.openers || ['So, what is your actual plan for Sunday?']);
  return { text: line, delayMs: 4000 + Math.floor(seededUnit(`${seed}:d`) * 9000) };
}

/** Contextual quick replies shown above the composer, derived from their profile. */
export function suggestedReplies(me, them) {
  const out = [];
  const shared = sharedTopics(me, them);
  if (them?.prompts?.[0]) out.push(`About "${them.prompts[0].q.slice(0, 22)}…" — mine is different`);
  if (shared[0]) out.push(`Okay, ${shared[0]} — settle this`);
  if (them?.city) out.push(`Best place in ${them.city} for a first meet?`);
  if (them?.job) out.push(`What does a bad day as ${them.job.toLowerCase()} look like?`);
  out.push('Two truths and a lie, go');
  return out.slice(0, 4);
}

/** Does this thread look stale? Used to nudge instead of silently rotting. */
export function staleness(messages, now = Date.now()) {
  const last = messages[messages.length - 1];
  if (!last) return { level: 'fresh', hours: 0 };
  const hours = (now - last.ts) / 3600_000;
  if (hours > 24 * 7) return { level: 'cold', hours };
  if (hours > 48) return { level: 'stale', hours };
  return { level: 'fresh', hours };
}
