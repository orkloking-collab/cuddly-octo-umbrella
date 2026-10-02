/**
 * People you can meet on Romancha.
 * Seeded demo dataset: real-shaped profiles (prompts, intent, lifestyle facts,
 * coordinates) instead of pretty names with no substance.
 *
 * `photos` are remote URLs on purpose — every <img> in the app goes through
 * <SmartImage>, which swaps in a locally generated portrait tile if a remote
 * photo fails, so the UI never shows a broken image.
 */

const UNSPLASH = (id, w = 720, h = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const PLACEHOLDER = (seed, n = 0) => `https://picsum.photos/seed/romancha-${seed}-${n}/720/900`;

export const INTEREST_LIBRARY = [
  'Late-night drives', 'Bookshops', 'Filter coffee', 'Poetry', 'Rainy windows',
  'Live jazz', 'Pottery', 'Trail running', 'Film photography', 'Chess',
  'Cooking for people', 'K-dramas', 'Thrillers', 'Salsa', 'Astronomy',
  'Thrifting', 'Board games', 'Cycling', 'Sea swimming', 'Stand-up comedy',
  'Vinyl records', 'Hiking', 'Journaling', 'Street food', 'Wine tasting',
  'Murder mysteries', 'Salsa nights', 'Museums', 'Cats', 'Dogs', 'Gardening',
  'Cricket', 'Football', 'Anime', 'Podcasts', 'Audiobooks', 'Scent layering',
];

export const PROMPT_LIBRARY = [
  { q: 'The way to win me over is…', a: ['buy me coffee and argue about films', 'send me the song that got me through the week', 'ask one real question, then actually listen'] },
  { q: 'A perfect Sunday looks like…', a: ['market run, long shower, nothing planned after 4pm', 'a 12km hike and a very unapologetic fry-up', 'two bookshops and exactly one (1) good pastry'] },
  { q: 'My most controversial opinion is…', a: ['the first love letter in a film is always the best one', 'pineapple belongs on pizza and I have receipts', 'voice notes > phone calls, fight me'] },
  { q: 'I get way too excited about…', a: ['a thunderstorm while everyone else cancels plans', 'finding a place that roasts its own beans', 'when the taxi driver plays exactly my playlist'] },
  { q: 'We will get along if…', a: ['you can be quiet together without it being awkward', 'you reply "on my way" and actually mean it', 'you have one thing you are nerdy about'] },
];

export const LOOKING_FOR = [
  { id: 'life_partner', label: 'Life partner', emoji: '💍' },
  { id: 'long_term', label: 'Long-term partner', emoji: '❤️' },
  { id: 'dates', label: 'Dating, see where it goes', emoji: '🌱' },
  { id: 'short_term', label: 'Something casual', emoji: '✨' },
  { id: 'new_friends', label: 'New friends', emoji: '🫶' },
  { id: 'networking', label: 'Creative collaborators', emoji: '🎨' },
];

export const GENDERS = ['Woman', 'Man', 'Non-binary'];
export const SEEKING = ['Women', 'Men', 'Non-binary', 'Anyone'];

export const CITIES = [
  { name: 'Rajshahi', country: 'Bangladesh', flag: '🇧🇩', lat: 24.3745, lng: 88.6042 },
  { name: 'Dhaka', country: 'Bangladesh', flag: '🇧🇩', lat: 23.8103, lng: 90.4125 },
  { name: 'Chattogram', country: 'Bangladesh', flag: '🇧🇩', lat: 22.3569, lng: 91.7832 },
  { name: 'Sylhet', country: 'Bangladesh', flag: '🇧🇩', lat: 24.8949, lng: 91.8687 },
  { name: 'Khulna', country: 'Bangladesh', flag: '🇧🇩', lat: 22.8456, lng: 89.5403 },
  { name: 'Kolkata', country: 'India', flag: '🇮🇳', lat: 22.5726, lng: 88.3639 },
  { name: 'Dubai', country: 'United Arab Emirates', flag: '🇦🇪', lat: 25.2048, lng: 55.2708 },
  { name: 'Istanbul', country: 'Türkiye', flag: '🇹🇷', lat: 41.0082, lng: 28.9784 },
  { name: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.5072, lng: -0.1276 },
  { name: 'Berlin', country: 'Germany', flag: '🇩🇪', lat: 52.52, lng: 13.405 },
  { name: 'Toronto', country: 'Canada', flag: '🇨🇦', lat: 43.6532, lng: -79.3832 },
  { name: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.7128, lng: -74.006 },
  { name: 'Singapore', country: 'Singapore', flag: '🇸🇬', lat: 1.3521, lng: 103.8198 },
  { name: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾', lat: 3.139, lng: 101.6869 },
  { name: 'Melbourne', country: 'Australia', flag: '🇦🇺', lat: -37.8136, lng: 144.9631 },
  { name: 'Cape Town', country: 'South Africa', flag: '🇿🇦', lat: -33.9249, lng: 18.4241 },
];

const jitter = (seed, i) => {
  const n = Math.sin(seed.charCodeAt(1) * 13 + i * 7) * 1000;
  return (n - Math.floor(n) - 0.5) * 0.06;
};

function person(seed, over) {
  const city = CITIES.find((c) => c.name === over.city) || CITIES[0];
  return {
    id: `dl-${seed}`,
    handle: `@${seed}`,
    seeking: ['Anyone'],
    languages: ['English'],
    drink: 'Socially',
    smoke: 'Never',
    exercise: '3-4x a week',
    education: "Bachelor's degree",
    kids: 'Open to kids',
    astro: '—',
    heightCm: 170,
    online: false,
    lastActiveMins: 120,
    verified: true,
    likesMe: false,
    openers: ['What is the best thing that happened to you this week?'],
    photos: [UNSPLASH('1544005313-94ddf0286df2'), PLACEHOLDER(seed, 1), PLACEHOLDER(seed, 2)],
    ...over,
    location: { lat: city.lat + jitter(seed, 1), lng: city.lng + jitter(seed, 2) },
    city: city.name,
    country: city.country,
    countryFlag: city.flag,
  };
}

export const datingProfiles = [
  person('noor_rahman', {
    name: 'Noor Rahman', age: 27, gender: 'Man', seeking: ['Women'],
    city: 'Dhaka', job: 'Architect', org: 'Unitex Studio',
    bio: 'I design small houses with big windows. Weekend formula: early boot ride, unnecessary amount of tea, one gallery I understand nothing about.',
    interests: ['Filter coffee', 'Cycling', 'Museums', 'Film photography', 'Cooking for people', 'Cricket'],
    prompts: [
      { q: 'The way to win me over is…', a: 'bring me to a rooftop and do not ask me to take a photo' },
      { q: 'My most controversial opinion is…', a: 'natural light beats every filter ever invented' },
    ],
    lookingFor: 'long_term', languages: ['Bangla', 'English'], drink: 'Never', kids: 'Want someday',
    heightCm: 178, exercise: 'Daily', astro: 'Cancer', online: true, lastActiveMins: 1,
    openers: ['Okay, honest answer: beach holiday or mountain cottage?', 'Which bookshop in Dhanmondi is actually worth the trip?'],
    photos: [UNSPLASH('1507003211169-0a1dd7228f2d'), PLACEHOLDER('noor1', 1), PLACEHOLDER('noor1', 2)],
  }),

  person('aisha_karim', {
    name: 'Aisha Karim', age: 25, gender: 'Woman', seeking: ['Men'],
    city: 'Rajshahi', job: 'Secondary school teacher', org: 'Rajshahi Zilla School',
    bio: 'Teach Literature, read too much, make a dangerous biryani. Looking for someone who can sit in silence without making it weird.',
    interests: ['Poetry', 'Bookshops', 'Rainy windows', 'Journaling', 'Thrifting', 'Audiobooks'],
    prompts: [
      { q: 'A perfect Sunday looks like…', a: 'Gram book market at 9am, river at 6pm, Rabindrasangeet on the speaker' },
      { q: 'We will get along if…', a: 'you have dog-eared paperbacks in your bag right now' },
    ],
    lookingFor: 'life_partner', languages: ['Bangla', 'English', 'Hindi'], drink: 'Never', smoke: 'Never',
    kids: 'Want someday', heightCm: 160, exercise: '1-2x a week', astro: 'Pisces', online: true, lastActiveMins: 3,
    likesMe: true,
    openers: ['Recommend me one poem that ruined you?', 'Okay: tea with sugar or without? choose carefully.'],
    photos: [UNSPLASH('1534528741775-53994a69daeb'), PLACEHOLDER('aisha1', 1)],
  }),

  person('tanvir_hasan', {
    name: 'Tanvir Hasan', age: 31, gender: 'Man', seeking: ['Women'],
    city: 'Chattogram', job: 'Marine logistics analyst', org: 'CPA Ltd',
    bio: 'Jobs keep me at the port, so I make the sea count twice — swimming before work, sunsets after. Divorce-free, drama-light, extremely good at grocery runs.',
    interests: ['Sea swimming', 'Late-night drives', 'Chess', 'Podcasts', 'Street food'],
    prompts: [
      { q: 'My most controversial opinion is…', a: 'a 5am swim is a personality trait, not a hobby' },
      { q: 'I get way too excited about…', a: 'low tide, good weather, and a road with no traffic' },
    ],
    lookingFor: 'dates', drink: 'Rarely', kids: 'Not yet', heightCm: 174, exercise: 'Daily',
    online: false, lastActiveMins: 35,
    openers: ['Which Kutubdia beach, honestly: sunrise or sunset?'],
  }),

  person('mim_sultana', {
    name: 'Mim Sultana', age: 23, gender: 'Woman', seeking: ['Men', 'Non-binary'],
    city: 'Dhaka', job: 'UX designer', org: 'Shohoz',
    bio: 'I fix apps that confuse your mother. IRL I am the friend who books the restaurant and the rickshaw.',
    interests: ['Pottery', 'K-dramas', 'Vinyl records', 'Board games', 'Cats', 'Stand-up comedy'],
    prompts: [
      { q: 'The way to win me over is…', a: 'send one (1) terrible pun at 11pm, I will match your energy' },
      { q: 'A perfect Sunday looks like…', a: 'pottery wheel, nap, then the worst reality TV with friends' },
    ],
    lookingFor: 'short_term', drink: 'Socially', kids: 'Not looking', heightCm: 158,
    verified: false, online: true, lastActiveMins: 0,
    openers: ['Two truths and a lie, go. I will win.'],
  }),

  person('rifat_ahmed', {
    name: 'Rifat Ahmed', age: 29, gender: 'Man', seeking: ['Anyone'],
    city: 'Sylhet', job: 'Tea garden operations', org: 'Beanis Bazar Estates',
    bio: 'Forty acres of bushes and zero small talk. I am nicer than my sleep schedule.',
    interests: ['Hiking', 'Trail running', 'Filter coffee', 'Astronomy', 'Dogs'],
    prompts: [
      { q: 'We will get along if…', a: 'you are fine with the plan changing because the sky looked good' },
      { q: 'I get way too excited about…', a: 'monsoon light on the terrace at 5am' },
    ],
    lookingFor: 'long_term', drink: 'Never', exercise: 'Daily', heightCm: 181,
    online: false, lastActiveMins: 240,
    openers: ['How far would you hike for the right view?'],
  }),

  person('sadia_islam', {
    name: 'Sadia Islam', age: 28, gender: 'Woman', seeking: ['Men'],
    city: 'Dhaka', job: 'OB/GYN resident doctor', org: 'Dhaka Medical',
    bio: 'Twelve-hour shifts make me extremely good at deciding what I want. I want someone kind who cooks while I am late.',
    interests: ['Cooking for people', 'Wine tasting', 'Thrillers', 'Gardening', 'Salsa'],
    prompts: [
      { q: 'My most controversial opinion is…', a: 'rom-coms are a public health measure' },
      { q: 'A perfect Sunday looks like…', a: 'farmer\u2019s market at 8, cooking for six people who were not invited' },
    ],
    lookingFor: 'life_partner', drink: 'Socially', kids: 'Want someday', heightCm: 165,
    online: false, lastActiveMins: 14, likesMe: true,
    openers: ['Tell me your signature dish and I will judge it kindly.'],
  }),

  person('omar_faruq', {
    name: 'Omar Faruq', age: 34, gender: 'Man', seeking: ['Women'],
    city: 'Khulna', job: 'Sundarbans guide & boat owner', org: 'Mongla River Trails',
    bio: 'I take people into the mangroves and bring them back with mud on their shoes. Widower, one brilliant 9-year-old daughter who outranks me.',
    interests: ['Photography', 'Birdwatching', 'Sea swimming', 'Live jazz', 'Journaling'],
    prompts: [
      { q: 'We will get along if…', a: 'my daughter being part of the deal is not a surprise to you' },
      { q: 'The way to win me over is…', a: 'be patient at 4:30am. That is when the forest is good.' },
    ],
    lookingFor: 'long_term', drink: 'Rarely', kids: 'Have kids', heightCm: 176,
    online: true, lastActiveMins: 8,
    openers: ['Would you get up at 4am for a tiger sighting? Be honest.'],
  }),

  person('june_park', {
    name: 'June Park', age: 26, gender: 'Non-binary', seeking: ['Anyone'],
    city: 'Berlin', job: 'Sound engineer', org: 'Kreuzberg Studios',
    bio: 'I make bands sound like themselves, only louder. Half Korean, half German, allergic to small talk about weather.',
    interests: ['Vinyl records', 'Live jazz', 'Scent layering', 'Anime', 'Pottery'],
    prompts: [
      { q: 'My most controversial opinion is…', a: 'reverb fixes more than therapy, sometimes' },
      { q: 'I get way too excited about…', a: 'a room with a three second decay tail' },
    ],
    lookingFor: 'dates', drink: 'Socially', kids: 'Open to kids', heightCm: 172,
    languages: ['English', 'German', 'Korean'], verified: false,
    online: false, lastActiveMins: 60,
    openers: ['Send me the last song that made you feel something.'],
  }),

  person('sofia_reyes', {
    name: 'Sofia Reyes', age: 30, gender: 'Woman', seeking: ['Men', 'Women'],
    city: 'London', job: 'ER nurse', org: 'St Thomas\u2019',
    bio: 'Night shifts, day hikes. I am direct, extremely loyal, and I will absolutely fall asleep during the film.',
    interests: ['Trail running', 'Museums', 'Cooking for people', 'Cats', 'Wine tasting'],
    prompts: [
      { q: 'The way to win me over is…', a: 'bring food to my door after a night shift and say nothing' },
      { q: 'A perfect Sunday looks like…', a: 'Regent\u2019s Canal run, then a very long lie-in' },
    ],
    lookingFor: 'long_term', drink: 'Socially', heightCm: 168,
    online: false, lastActiveMins: 300,
    openers: ['What time do you actually go to sleep? No lying.'],
  }),

  person('dev_menon', {
    name: 'Dev Menon', age: 27, gender: 'Man', seeking: ['Women'],
    city: 'Singapore', job: 'Backend engineer', org: 'Freelance',
    bio: 'Remote worker, local food obsessed. I can fix your wifi and lose my boarding pass in the same hour.',
    interests: ['Street food', 'Football', 'Chess', 'Film photography', 'Podcasts'],
    prompts: [
      { q: 'We will get along if…', a: 'you also think hawker centres beat any restaurant' },
      { q: 'My most controversial opinion is…', a: 'durian is a fruit, not a dare' },
    ],
    lookingFor: 'new_friends', drink: 'Socially', heightCm: 170, verified: false,
    online: true, lastActiveMins: 2,
    openers: ['Rank the best late-night food in your city. Go.'],
  }),

  person('hana_rahman', {
    name: 'Hana Rahman', age: 24, gender: 'Woman', seeking: ['Men'],
    city: 'Toronto', job: 'MSc Climate science student', org: 'U of T',
    bio: 'Bangladeshi-Canadian, model of the Bay of Bengal on my desk. I cry at glaciers and I am competitive about karaoke.',
    interests: ['Hiking', 'Astronomy', 'K-dramas', 'Thrifting', 'Stand-up comedy'],
    prompts: [
      { q: 'I get way too excited about…', a: 'a data set that finally behaves' },
      { q: 'A perfect Sunday looks like…', a: 'Crescent Town market, then a film I have seen before' },
    ],
    lookingFor: 'dates', drink: 'Socially', heightCm: 163,
    online: true, lastActiveMins: 6,
    openers: ['Karaoke duet: which one? Choose wisely.'],
  }),

  person('yusuf_demir', {
    name: 'Yusuf Demir', age: 33, gender: 'Man', seeking: ['Women'],
    city: 'Istanbul', job: 'Restoration architect', org: 'Independent',
    bio: 'I repair old buildings for a living, so I am patient with everything including you.',
    interests: ['Poetry', 'Bookshops', 'Wine tasting', 'Cycling', 'Scent layering'],
    prompts: [
      { q: 'The way to win me over is…', a: 'walk slowly and look up' },
      { q: 'My most controversial opinion is…', a: 'ferries beat flights, every time' },
    ],
    lookingFor: 'life_partner', drink: 'Rarely', kids: 'Want someday', heightCm: 183,
    online: false, lastActiveMins: 900,
    openers: ['What building do you love for no reason?'],
  }),

  person('priya_das', {
    name: 'Priya Das', age: 35, gender: 'Woman', seeking: ['Men', 'Women'],
    city: 'Kolkata', job: 'Independent film editor', org: 'Freelance',
    bio: 'Two documentaries, one cat, one very small kitchen. I cut 400 hours down to 90 minutes for a living, so I will not waste your evening.',
    interests: ['Cinema', 'Live jazz', 'Filter coffee', 'Painting', 'Board games'],
    prompts: [
      { q: 'We will get along if…', a: 'you can watch a black-and-white film without your phone out' },
      { q: 'A perfect Sunday looks like…', a: 'adda until noon, editing until 6, biryani after' },
    ],
    lookingFor: 'long_term', drink: 'Socially', kids: 'Not looking', heightCm: 166,
    online: false, lastActiveMins: 45, likesMe: true,
    openers: ['Last film that genuinely surprised you?'],
    photos: [PLACEHOLDER('priya0', 0), PLACEHOLDER('priya1', 1)],
  }),

  person('kai_andersen', {
    name: 'Kai Andersen', age: 29, gender: 'Man', seeking: ['Anyone'],
    city: 'Melbourne', job: 'Surf lifeguard / barista', org: 'Brighton SLSC',
    bio: 'Cold water, warm coffee. I am told my restlessness is charming on a good day.',
    interests: ['Sea swimming', 'Trail running', 'Vinyl records', 'Dogs', 'Street food'],
    prompts: [
      { q: 'I get way too excited about…', a: 'a clean 2ft swell and an empty beach' },
      { q: 'My most controversial opinion is…', a: 'flat white beats espresso, no further questions' },
    ],
    lookingFor: 'short_term', drink: 'Socially', kids: 'Not looking', heightCm: 186, verified: false,
    online: true, lastActiveMins: 4,
    openers: ['Ocean or mountains this weekend?'],
  }),

  person('layla_hassan', {
    name: 'Layla Hassan', age: 32, gender: 'Woman', seeking: ['Men'],
    city: 'Dubai', job: 'Interior designer', org: 'Zara Home ME',
    bio: 'I make rooms behave. Off duty: 6am padel, bookshop browsing, one very long shower.',
    interests: ['Pottery', 'Scent layering', 'Wine tasting', 'Gardening', 'Audiobooks'],
    prompts: [
      { q: 'The way to win me over is…', a: 'be on time. That is the entire test.' },
      { q: 'We will get along if…', a: 'you have a hobby with no audience' },
    ],
    lookingFor: 'long_term', drink: 'Never', kids: 'Want someday', heightCm: 170,
    online: false, lastActiveMins: 30,
    openers: ['What is the last room you redesigned in your head?'],
  }),

  person('arnob_haque', {
    name: 'Arnob Haque', age: 26, gender: 'Man', seeking: ['Women'],
    city: 'Dhaka', job: 'Jr. surgeon (resident)', org: 'Square Hospital',
    bio: 'First-year resident, so my calendar is a horror story. If I text back fast, cancel something else. That is how you know.',
    interests: ['Cricket', 'Cooking for people', 'Journaling', 'Film photography', 'Cycling'],
    prompts: [
      { q: 'A perfect Sunday looks like…', a: 'no pager, old Dhaka for breakfast, a long ride at dusk' },
      { q: 'I get way too excited about…', a: 'a hospital shift that ends early' },
    ],
    lookingFor: 'dates', drink: 'Rarely', heightCm: 175, online: false, lastActiveMins: 480,
    openers: ['What is your relationship with 3am?'],
  }),

  person('zara_rahman', {
    name: 'Zara Rahman', age: 41, gender: 'Woman', seeking: ['Men'],
    city: 'Cape Town', job: 'Marine biologist', org: 'SAIAB',
    bio: 'Divorced, two teenagers who live with me, one boat. I study seals and have very little patience for games.',
    interests: ['Sea swimming', 'Astronomy', 'Gardening', 'Poetry', 'Hiking'],
    prompts: [
      { q: 'We will get along if…', a: 'you are fine that the kids come first, permanently, happily' },
      { q: 'My most controversial opinion is…', a: 'Dating after 40 is the most honest version of dating' },
    ],
    lookingFor: 'long_term', drink: 'Rarely', kids: 'Have kids', heightCm: 171,
    online: false, lastActiveMins: 1500,
    openers: ['What did you unlearn in your thirties?'],
  }),

  person('shahriar_kabir', {
    name: 'Shahriar Kabir', age: 22, gender: 'Man', seeking: ['Women', 'Men'],
    city: 'Rajshahi', job: 'CSE student & part-time DJ', org: 'RU',
    bio: 'I play wedding sets to fund my ramen habit. Terrible at texting, excellent at showing up.',
    interests: ['Live jazz', 'Anime', 'Board games', 'Football', 'K-dramas'],
    prompts: [
      { q: 'I get way too excited about…', a: 'a crowd that asks for a song I have never practised' },
      { q: 'A perfect Sunday looks like…', a: 'Padma bridge ride at 6pm, then a long set at a rooftop' },
    ],
    lookingFor: 'new_friends', drink: 'Socially', kids: 'Not yet', heightCm: 173, verified: false,
    online: true, lastActiveMins: 0,
    openers: ['What song describes your week? I will mix it.'],
  }),

  person('farhana_majid', {
    name: 'Farhana Majid', age: 30, gender: 'Woman', seeking: ['Men'],
    city: 'Dhaka', job: 'Architectural conservator', org: 'Old Dhaka Trust',
    bio: 'I save buildings nobody else wants. I am calmer than I look and much worse at small talk than I should be.',
    interests: ['Museums', 'Film photography', 'Cooking for people', 'Poetry', 'Cycling'],
    prompts: [{ q: 'The way to win me over is…', a: 'walk slowly through a neighbourhood and notice things' }],
    lookingFor: 'long_term', drink: 'Rarely', kids: 'Open to kids', heightCm: 167, online: true, lastActiveMins: 5,
    openers: ['What building do you love that everyone else calls ugly?'],
  }),

  person('rizwan_karim', {
    name: 'Rizwan Karim', age: 29, gender: 'Man', seeking: ['Women'],
    city: 'Rajshahi', job: 'Lecturer, Civil Engineering', org: 'RUET',
    bio: 'Teaching, a mango tree I inherited, and one (1) motorcycle that needs me. Looking for a person, not a project.',
    interests: ['Reading', 'Cricket', 'Gardening', 'Road trips', 'Chess'],
    prompts: [{ q: 'A perfect Sunday looks like…', a: 'Padma at golden hour, then rice and dal at Ammubashir' }],
    lookingFor: 'life_partner', drink: 'Never', kids: 'Want someday', heightCm: 177, verified: true,
    online: false, lastActiveMins: 90,
    openers: ['Best book you have finished this year — I will hold you to it.'],
  }),

  person('anika_chowdhury', {
    name: 'Anika Chowdhury', age: 26, gender: 'Woman', seeking: ['Men', 'Women'],
    city: 'Sylhet', job: 'Tea sommelier & QSR owner', org: 'Beanis',
    bio: 'I cup tea for a living so yes, I will judge your order. I am kind about it, but I judge it.',
    interests: ['Filter coffee', 'Hiking', 'Vinyl records', 'Journaling', 'Dogs'],
    prompts: [{ q: 'My most controversial opinion is…', a: 'most cafés should charge less and brew better' }],
    lookingFor: 'dates', drink: 'Socially', heightCm: 162, online: true, lastActiveMins: 2,
    openers: ['Describe your morning in five words. I will guess your sleep schedule.'],
  }),

  person('mahin_rahman', {
    name: 'Mahin Rahman', age: 24, gender: 'Man', seeking: ['Women'],
    city: 'Dhaka', job: 'Junior doctor (intern)', org: 'BSMMU',
    bio: 'On call more than is reasonable. I make an excellent plate of rice and I listen properly — both are skills.',
    interests: ['Reading', 'Football', 'Cooking for people', 'Podcasts', 'Cycling'],
    prompts: [{ q: 'We will get along if…', a: 'you can wait 40 minutes outside a hospital without complaining' }],
    lookingFor: 'dates', drink: 'Never', kids: 'Open to kids', heightCm: 171, verified: false,
    online: false, lastActiveMins: 200,
    openers: ['What did you eat today? This is a personality test.'],
  }),

  person('sabbir_hossain', {
    name: 'Sabbir Hossain', age: 36, gender: 'Man', seeking: ['Women'],
    city: 'Chattogram', job: 'Port captain’s officer', org: 'CPA',
    bio: 'Divorced well, no kids. Twelve years at the port taught me to stay calm in bad weather and to say what I mean.',
    interests: ['Sea swimming', 'Reading', 'Cooking for people', 'Cricket', 'Photography'],
    prompts: [{ q: 'I get way too excited about…', a: 'a clean mooring job and a sunset afterwards' }],
    lookingFor: 'long_term', drink: 'Rarely', kids: 'Open to kids', heightCm: 180,
    online: false, lastActiveMins: 60, likesMe: true,
    openers: ['Would you rather have a quiet life or an interesting one? Both is a trap answer.'],
  }),

  person('nusrat_jahan', {
    name: 'Nusrat Jahan', age: 31, gender: 'Woman', seeking: ['Men'],
    city: 'Khulna', job: 'Microfinance field officer', org: 'ASA',
    bio: 'I ride a motorbike into villages and count other people’s money all day, so I have very little patience for vague answers.',
    interests: ['Gardening', 'Travel', 'Dogs', 'Journaling', 'Cycling'],
    prompts: [{ q: 'The way to win me over is…', a: 'be where you said you would be' }],
    lookingFor: 'life_partner', drink: 'Never', kids: 'Have kids', heightCm: 159,
    online: true, lastActiveMins: 12,
    openers: ['What is a promise you have kept for years?'],
  }),

  person('imran_shahriar', {
    name: 'Imran Shahriar', age: 28, gender: 'Man', seeking: ['Women', 'Men'],
    city: 'Kolkata', job: 'Sound designer for theatre', org: 'Srirangam',
    bio: 'Bangla theatre, Adda at the park, and a record collection I cannot justify. I am fluent in three languages and bad at all of them emotionally.',
    interests: ['Live jazz', 'Theatre', 'Poetry', 'Vinyl records', 'Cinema'],
    prompts: [{ q: 'A perfect Sunday looks like…', a: 'College Street in the morning, a play at 7, biryani at 10' }],
    lookingFor: 'dates', drink: 'Socially', heightCm: 174, verified: false,
    online: false, lastActiveMins: 30,
    openers: ['Name a play or film that changed how you think.'],
  }),

  person('tania_sarker', {
    name: 'Tania Sarker', age: 33, gender: 'Woman', seeking: ['Men'],
    city: 'Dubai', job: 'Aviation ops manager', org: 'Emirates',
    bio: 'Expat, eight years in. I have a life I built and I am not looking to be rescued from it — just company for the good parts.',
    interests: ['Fitness', 'Wine tasting', 'Travel', 'Reading', 'Salsa'],
    prompts: [{ q: 'We will get along if…', a: 'you have your own thing going on' }],
    lookingFor: 'long_term', drink: 'Socially', kids: 'Not looking', heightCm: 168,
    online: false, lastActiveMins: 400,
    openers: ['What does a good Tuesday look like for you?'],
  }),

  person('dev_cho', {
    name: 'Dev Cho', age: 30, gender: 'Man', seeking: ['Women', 'Men'],
    city: 'Toronto', job: 'Pastry chef', org: 'King West',
    bio: 'I work nights, which means I am extremely awake at 4am and excellent at breakfast. Cats preferred, drama declined.',
    interests: ['Cooking for people', 'Dogs', 'Cats', 'Board games', 'Cycling'],
    prompts: [{ q: 'I get way too excited about…', a: 'a lamination that behaves' }],
    lookingFor: 'new_friends', drink: 'Rarely', heightCm: 172,
    online: true, lastActiveMins: 7,
    openers: ['What is the best thing you have eaten this week?'],
  }),

  person('layla_nasser', {
    name: 'Layla Nasser', age: 29, gender: 'Woman', seeking: ['Men'],
    city: 'Berlin', job: 'Medical researcher', org: 'Charité',
    bio: 'Bangladeshi-German, lab by day, techno by Friday. I read fiction to switch my brain off and I am bad at texting back fast.',
    interests: ['Reading', 'Poetry', 'Running', 'Vinyl records', 'Museums'],
    prompts: [{ q: 'My most controversial opinion is…', a: 'the group chat is worse than the phone call' }],
    lookingFor: 'long_term', drink: 'Socially', heightCm: 165, verified: true,
    online: false, lastActiveMins: 150, likesMe: true,
    openers: ['What are you reading right now?'],
  }),

  person('hasan_mahmud', {
    name: 'Hasan Mahmud', age: 32, gender: 'Man', seeking: ['Women'],
    city: 'Singapore', job: 'Structural engineer', org: 'Arup',
    bio: 'Dhaka born, Singapore based, still can’t find good mustard oil here. I run, I build shelves for friends, I call my mother daily.',
    interests: ['Cycling', 'Football', 'Travel', 'Cooking for people', 'Fitness'],
    prompts: [{ q: 'A perfect Sunday looks like…', a: 'East Coast run at 6, brunch at 9, napping is not optional' }],
    lookingFor: 'life_partner', drink: 'Never', kids: 'Want someday', heightCm: 176,
    online: false, lastActiveMins: 45,
    openers: ['Would you move cities for the right person?'],
  }),

  person('riya_sen', {
    name: 'Riya Sen', age: 27, gender: 'Non-binary', seeking: ['Men', 'Women', 'Non-binary'],
    city: 'Kolkata', job: 'Illustrator & zine maker', org: 'Freelance',
    bio: 'I draw people on the metro, which is either romantic or illegal depending on the day. Softest person you will meet, loudest at dinner.',
    interests: ['Painting', 'Comics', 'Poetry', 'Cycling', 'Live jazz', 'Anime'],
    prompts: [{ q: 'The way to win me over is…', a: 'send me a terrible drawing you made while bored' }],
    lookingFor: 'short_term', drink: 'Socially', heightCm: 164, verified: false,
    online: true, lastActiveMins: 1,
    openers: ['Draw me something. It can be a potato.'],
  }),

  person('omar_zaman', {
    name: 'Omar Zaman', age: 45, gender: 'Man', seeking: ['Women'],
    city: 'London', job: 'GP (family doctor)', org: 'NHS',
    bio: 'Divorced, two grown kids, one bad knee. I want a companion for long walks, honest talk and a kitchen that smells like someone is cooking.',
    interests: ['Reading', 'Poetry', 'Walking', 'Gardening', 'Cooking for people'],
    prompts: [{ q: 'We will get along if…', a: 'you want a Sunday roast and a conversation, not a performance' }],
    lookingFor: 'long_term', drink: 'Rarely', kids: 'Have kids', heightCm: 182,
    online: false, lastActiveMins: 20,
    openers: ['What is something you only know because of your family?'],
  }),

  person('sudipta_roy', {
    name: 'Sudipta Roy', age: 38, gender: 'Man', seeking: ['Women', 'Men'],
    city: 'Rajshahi', job: 'Documentary editor', org: 'Independent',
    bio: 'I cut other people’s stories for a living, so I notice details. Quiet in groups, relentless one-to-one.',
    interests: ['Cinema', 'Photography', 'Music', 'Reading', 'Chess'],
    prompts: [{ q: 'I get way too excited about…', a: 'a first-cut assembly that actually works' }],
    lookingFor: 'long_term', drink: 'Never', kids: 'Open to kids', heightCm: 169,
    online: false, lastActiveMins: 100, likesMe: true,
    openers: ['What is the last thing that made you lose track of time?'],
  }),

  person('mehjabin_haque', {
    name: 'Mehjabin Haque', age: 22, gender: 'Woman', seeking: ['Men'],
    city: 'Rajshahi', job: 'English Literature, RU', org: 'University of Rajshahi',
    bio: 'Final year, debate team, extremely online. I want something real and I am going to be difficult about the definition of real.',
    interests: ['Poetry', 'K-dramas', 'Bookshops', 'Music', 'Travel'],
    prompts: [{ q: 'My most controversial opinion is…', a: 'the film is not always better, fight me' }],
    lookingFor: 'new_friends', drink: 'Never', kids: 'Not yet', heightCm: 157, verified: false,
    online: true, lastActiveMins: 0,
    openers: ['Rank your top three poets. I am keeping score.'],
  }),
];

/** Profiles that are deliberately surfaced in the "Likes You" tab. */
export const incomingLikes = datingProfiles.filter((p) => p.likesMe).map((p) => p.id);

/** Small helper used by onboarding to fill a sensible default location. */
export function nearestCity(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return CITIES[0];
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
