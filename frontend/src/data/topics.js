// Onboarding topic catalogue → drives the personal profile and personalised
// suggestions across research, debate and semantic search. Icons are Material
// Symbols names (loaded app-wide). Each topic carries sample research/debate
// questions used to tailor suggestions to the user's chosen mix.

export const TOPIC_CATEGORIES = [
  {
    cat: "Science & Technology", accent: "#3ef07f",
    topics: [
      { key: "ai", name: "Artificial Intelligence", icon: "smart_toy", r: "How close are we to artificial general intelligence?", d: "Should advanced AI development be paused until safety catches up?" },
      { key: "quantum", name: "Quantum Computing", icon: "memory", r: "What can quantum computers do that classical ones cannot?", d: "Is quantum supremacy overhyped for real-world problems?" },
      { key: "biotech", name: "Biotechnology", icon: "biotech", r: "How is CRISPR changing modern medicine?", d: "Should human germline gene editing be allowed?" },
      { key: "robotics", name: "Robotics", icon: "precision_manufacturing", r: "How are humanoid robots progressing in 2026?", d: "Will automation create more jobs than it destroys?" },
      { key: "cybersecurity", name: "Cybersecurity", icon: "security", r: "What are the biggest cyber threats facing companies today?", d: "Should governments be allowed backdoors into encryption?" },
      { key: "software", name: "Software & Dev", icon: "code", r: "How is AI changing how software gets built?", d: "Are low-code platforms the future of development?" },
    ],
  },
  {
    cat: "Health & Medicine", accent: "#00ccff",
    topics: [
      { key: "nutrition", name: "Nutrition", icon: "restaurant", r: "What does the evidence say about intermittent fasting?", d: "Is a plant-based diet clearly healthier than an omnivorous one?" },
      { key: "mentalhealth", name: "Mental Health", icon: "self_improvement", r: "What actually works for treating anxiety?", d: "Should social media be regulated to protect teen mental health?" },
      { key: "longevity", name: "Longevity", icon: "ecg_heart", r: "Which longevity interventions have the strongest evidence?", d: "Is the pursuit of radical life extension a good use of resources?" },
      { key: "neuroscience", name: "Neuroscience", icon: "neurology", r: "How does the brain form and store memories?", d: "Is free will an illusion given what we know about the brain?" },
      { key: "pandemics", name: "Public Health", icon: "vaccines", r: "What lessons did we learn from recent pandemics?", d: "Should vaccination be mandatory during a pandemic?" },
      { key: "genetics", name: "Genetics", icon: "genetics", r: "How much of who we are is determined by our genes?", d: "Should genetic screening of embryos be routine?" },
    ],
  },
  {
    cat: "Business & Economics", accent: "#ffb64a",
    topics: [
      { key: "startups", name: "Startups", icon: "rocket_launch", r: "What separates startups that scale from those that fail?", d: "Is the venture-capital model good for innovation?" },
      { key: "crypto", name: "Crypto & Web3", icon: "currency_bitcoin", r: "What real problems does blockchain actually solve?", d: "Are cryptocurrencies a genuine asset class or a bubble?" },
      { key: "markets", name: "Markets & Investing", icon: "trending_up", r: "How do interest rates move stock markets?", d: "Can active investing beat index funds over the long run?" },
      { key: "economics", name: "Economics", icon: "payments", r: "What causes inflation and how is it controlled?", d: "Would a universal basic income help or hurt the economy?" },
      { key: "future-work", name: "Future of Work", icon: "work", r: "How will remote work reshape careers this decade?", d: "Is the four-day work week viable at scale?" },
      { key: "marketing", name: "Marketing & Brand", icon: "campaign", r: "What makes a brand memorable in a crowded market?", d: "Is influencer marketing worth the investment?" },
    ],
  },
  {
    cat: "Society & Politics", accent: "#ff6b8a",
    topics: [
      { key: "geopolitics", name: "Geopolitics", icon: "public", r: "What is reshaping global power balances in 2026?", d: "Is a multipolar world more stable than a unipolar one?" },
      { key: "policy", name: "Public Policy", icon: "gavel", r: "What policies most effectively reduce inequality?", d: "Should there be a wealth tax on the ultra-rich?" },
      { key: "education", name: "Education", icon: "school", r: "How should education adapt to the age of AI?", d: "Are standardized tests a fair measure of ability?" },
      { key: "media", name: "Media & Journalism", icon: "newspaper", r: "How is AI changing the news we consume?", d: "Can journalism stay independent in the attention economy?" },
      { key: "law", name: "Law & Justice", icon: "balance", r: "How is technology changing the practice of law?", d: "Should AI be used in criminal sentencing decisions?" },
      { key: "cities", name: "Cities & Urbanism", icon: "location_city", r: "What makes a city genuinely liveable?", d: "Are smart cities worth the privacy trade-offs?" },
    ],
  },
  {
    cat: "Environment & Climate", accent: "#3ef07f",
    topics: [
      { key: "climate", name: "Climate Science", icon: "thermostat", r: "What actually causes climate change?", d: "Is nuclear power essential to solving climate change?" },
      { key: "energy", name: "Energy", icon: "bolt", r: "Can renewables realistically power the whole grid?", d: "Should governments subsidise fossil fuels during transitions?" },
      { key: "sustainability", name: "Sustainability", icon: "recycling", r: "What does a truly circular economy look like?", d: "Is individual action meaningful against climate change?" },
      { key: "oceans", name: "Oceans", icon: "water", r: "How is ocean acidification affecting marine life?", d: "Should deep-sea mining be banned?" },
      { key: "biodiversity", name: "Biodiversity", icon: "forest", r: "Why does biodiversity loss matter for humans?", d: "Should we bring back extinct species through de-extinction?" },
      { key: "food", name: "Food & Agriculture", icon: "agriculture", r: "How do we feed 10 billion people sustainably?", d: "Is lab-grown meat the future of protein?" },
    ],
  },
  {
    cat: "Space & Physics", accent: "#00ccff",
    topics: [
      { key: "space", name: "Space Exploration", icon: "rocket", r: "What are the biggest hurdles to crewed Mars missions?", d: "Should we colonize Mars, or fix Earth first?" },
      { key: "astronomy", name: "Astronomy", icon: "nights_stay", r: "What has the latest generation of telescopes revealed?", d: "Is the search for extraterrestrial life worth the cost?" },
      { key: "physics", name: "Fundamental Physics", icon: "science", r: "Where does the search for a theory of everything stand?", d: "Is string theory science or untestable philosophy?" },
      { key: "cosmology", name: "Cosmology", icon: "blur_circular", r: "What do we actually know about dark matter and dark energy?", d: "Does the multiverse hypothesis belong in science?" },
      { key: "spacetech", name: "Space Industry", icon: "satellite_alt", r: "How is the private space sector changing access to orbit?", d: "Should space resources be privately ownable?" },
    ],
  },
  {
    cat: "Arts & Culture", accent: "#a855f7",
    topics: [
      { key: "film", name: "Film & TV", icon: "movie", r: "How is AI reshaping filmmaking and VFX?", d: "Is streaming better or worse for the art of cinema?" },
      { key: "music", name: "Music", icon: "music_note", r: "How is AI-generated music changing the industry?", d: "Should AI-made music be eligible for awards?" },
      { key: "design", name: "Design", icon: "palette", r: "What makes a design feel genuinely premium?", d: "Is minimalism overrated in modern design?" },
      { key: "gaming", name: "Gaming", icon: "sports_esports", r: "How is generative AI changing game development?", d: "Are loot boxes a form of gambling?" },
      { key: "literature", name: "Literature", icon: "menu_book", r: "How is AI affecting how books are written and read?", d: "Can an AI author produce genuinely great literature?" },
      { key: "history", name: "History", icon: "history_edu", r: "What historical turning points shaped the modern world?", d: "Do great individuals or broad forces drive history?" },
    ],
  },
  {
    cat: "Philosophy & Ethics", accent: "#ffd700",
    topics: [
      { key: "ethics", name: "Ethics", icon: "handshake", r: "How should we think about the ethics of emerging tech?", d: "Is there such a thing as objective morality?" },
      { key: "consciousness", name: "Consciousness", icon: "psychology", r: "What are the leading theories of consciousness?", d: "Could a machine ever be truly conscious?" },
      { key: "aiethics", name: "AI Ethics", icon: "policy", r: "How do we keep AI aligned with human values?", d: "Who should be liable when an AI causes harm?" },
      { key: "religion", name: "Religion & Belief", icon: "temple_buddhist", r: "How do belief systems shape societies?", d: "Are science and religion fundamentally in conflict?" },
      { key: "logic", name: "Logic & Reasoning", icon: "account_tree", r: "What are the most common reasoning fallacies?", d: "Is human reasoning fundamentally rational?" },
    ],
  },
];

// Flat list of all topics with their category accent attached.
export const ALL_TOPICS = TOPIC_CATEGORIES.flatMap((c) =>
  c.topics.map((t) => ({ ...t, cat: c.cat, accent: c.accent }))
);

const BY_KEY = Object.fromEntries(ALL_TOPICS.map((t) => [t.key, t]));

export function topicByKey(key) {
  return BY_KEY[key] || null;
}
