import { WhisperModeId } from "./whisperModes";

export const MODE_TEMPLATES: Record<WhisperModeId, string[]> = {
  anonymous: [
    "Send me an anonymous whisper...",
    "Tell me a secret you've never told anyone 🤫",
    "What's on your mind right now?",
    "What is something you secretly wish I knew?",
    "Drop your unfiltered thoughts about me.",
    "Tell me something you wouldn't say to my face.",
    "What was the first thing you ever thought about me?",
    "If you could ask me anything with zero consequences, what is it?",
    "Send me a song that reminds you of me 🎵",
    "What's a weird thing we have in common?",
    "Tell me a truth you've been holding back.",
    "Describe me in exactly 3 emojis.",
    "What is your favorite memory involving me?",
    "If you could change one thing about our interactions, what would it be?",
    "What's your biggest guilty pleasure?",
    "What is something you find intriguing about me?",
    "Tell me a random story about your day.",
    "What's the best piece of advice you've ever received?",
    "Send me something that will make me laugh today 😂",
    "What's something you think I'd be surprised to find out about you?",
    "If we were trapped on an island, what would happen?",
    "What movie or show character do I remind you of?",
    "Tell me a rumour you heard about me.",
    "What's the boldest thing you've ever wanted to tell me?",
    "If you could teleport to anywhere right now, where would you go?",
    "What do you think is my secret talent?",
    "Drop an anonymous confession or thought.",
    "What's your current 2 AM thought?",
    "Give me an anonymous life recommendation.",
    "Send me an anonymous message before this link expires!"
  ],

  confess: [
    "Tell me something you've always wanted to say.",
    "Confess a secret you hid from me 🫣",
    "What is something you never had the courage to say in person?",
    "I have a confession: ...",
    "Confess your biggest mistake to me anonymously.",
    "Tell me a lie you told me that I believed.",
    "What's something you did that you still feel guilty about?",
    "Confess a weird crush or habit you have.",
    "What's a truth about you that nobody around you knows?",
    "Confess something you secretly judge people for.",
    "What was a moment you were jealous of me?",
    "Tell me about a time you secretly helped or checked on me.",
    "Confess a secret thought you had about me recently.",
    "What's the most embarrassing thing on your search history?",
    "Confess something you wish you could undo.",
    "Have you ever lied to get out of hanging out with me?",
    "Confess a secret ambition or dream nobody takes seriously.",
    "What's the wildest thing you've ever gotten away with?",
    "Confess your biggest regret from this past year.",
    "Tell me something you stole (or borrowed and never returned) 🤫",
    "Confess what you really thought when we first met.",
    "What's something you pretend to like just to fit in?",
    "Confess a petty reason you stopped talking to someone.",
    "What's a secret promise you made to yourself?",
    "Confess the cringiest thing you did for a crush.",
    "What is something you secretly enjoy that people hate?",
    "Confess something you want to get off your chest right now.",
    "What's the biggest secret your friend group is hiding?",
    "Tell me a secret you promised you'd take to the grave.",
    "Drop your anonymous confession box message here!"
  ],

  about: [
    "Tell me one thing about me that you like, dislike, or think I should know 👀",
    "What's my biggest green flag and red flag? 🚩",
    "What was your 100% honest first impression of me?",
    "What vibe do I give off when people first meet me?",
    "What is one habit of mine you find funny or cute?",
    "If you had to describe me to a stranger, what would you say?",
    "What is one thing I do that you think I should do more often?",
    "What is one assumption people make about me that is wrong?",
    "Tell me one aesthetic or outfit of mine you loved ✨",
    "What kind of person do you think I'm best suited to be around?",
    "What's one thing about my personality that stands out?",
    "What do you think is my biggest strength and weakness?",
    "What energy do I bring into a room?",
    "What is one thing about me that intimidated you at first?",
    "If I were a color, song, or season, what would I be?",
    "What is one thing you think I worry too much about?",
    "What do you think is my favorite topic to talk about?",
    "Tell me one memorable conversation we had.",
    "What is one thing about me that you admire from afar?",
    "Do you think I'm an introvert, extrovert, or ambivert?",
    "What's one thing you think I could easily achieve in life?",
    "Tell me one thing you noticed about me that I think nobody sees.",
    "What's the funniest thing you've ever seen me do?",
    "What's one compliment you've wanted to give me about my vibe?",
    "If I were a character in a game, what would my superpower be?",
    "What's one boundary or trait you respect about me?",
    "Tell me what people say about me when I'm not in the room.",
    "What's one thing you wish we did together?",
    "What's the best quality about me that shouldn't change?",
    "Tell me one thing about me in complete honesty!"
  ],

  ask: [
    "Ask me anything without holding back ❓",
    "What question have you always wanted to ask me?",
    "Ask me for advice on something you're dealing with.",
    "What's something about my life you've always wondered about?",
    "Ask me a deep 3 AM existential question 🌌",
    "Ask me a 'Would you rather' question!",
    "Ask me about my biggest fear or goal.",
    "What's something you want my unfiltered perspective on?",
    "Ask me about my dating life or relationship status.",
    "What do you want to know about my future plans?",
    "Ask me what I think about a specific topic or trend.",
    "Ask me about my most embarrassing story.",
    "What's the hardest question you can throw at me?",
    "Ask me to choose between two people or things!",
    "Ask me about my best and worst habits.",
    "Ask me what my biggest turning point in life was.",
    "Ask me about a secret skill or hobby I have.",
    "Ask me for my honest review of anything!",
    "What question are you too nervous to ask in person?",
    "Ask me who my favorite people to hang out with are.",
    "Ask me what I look for in a best friend or partner.",
    "Ask me how I handle stress or heartbreak.",
    "Ask me a funny hypothetical scenario question 😂",
    "Ask me about a mistake that taught me the most.",
    "Ask me what playlist I've been listening to on repeat 🎧",
    "Ask me what my daily routine actually looks like.",
    "Ask me for an unpopular opinion I hold.",
    "Ask me what book, movie, or song changed my life.",
    "Ask me a question only someone who knows me well would ask.",
    "Drop your anonymous question — answering everything!"
  ],

  opinion: [
    "What is your 100% honest opinion of me? 💭",
    "What's something I could improve about myself?",
    "Give me your unfiltered opinion on my current aesthetic/vibe.",
    "What is your honest opinion on how I treat people?",
    "What do you think is my biggest blind spot?",
    "Give me constructive criticism you think I need to hear.",
    "What's your honest opinion on my social media posts?",
    "Do you think I'm easy to talk to or hard to read?",
    "What is an honest opinion you have about my choices recently?",
    "Do you think I'm living up to my potential?",
    "What is your opinion on how I handle conflicts or drama?",
    "Give me your honest opinion on our friendship / dynamic.",
    "Do you think I care too much about what people think?",
    "What's one thing you think I should stop doing immediately?",
    "What's your opinion on my style and fashion taste?",
    "Do you think I'm trustworthy with secrets?",
    "What's your opinion on the energy I bring around friends?",
    "Give me an honest review of my personality (1 to 10).",
    "Do you think I'm more confident than I actually feel?",
    "What's an opinion you used to have of me that changed?",
    "Do you think I push people away or let people in easily?",
    "What's an honest opinion you hold that most people disagree with?",
    "Do you think I'm a good listener?",
    "What's your opinion on how I express my emotions?",
    "Give me your rawest, most truthful thought about me.",
    "Do you think I should be more bold or more patient?",
    "What's an opinion on my humor — is it actually funny? 😂",
    "What's something you think I'm underestimating about myself?",
    "Do you think I've changed over the past year?",
    "Drop your honest, no-sugarcoating opinion right here."
  ],

  crush: [
    "Do you have a crush on me? Tell me secretly ❤️",
    "Leave a hint about who you are! 🤫",
    "What made you secretly like me?",
    "Would we make a cute couple? Be honest 👀",
    "What's your favorite thing about my smile or eyes?",
    "When was the exact moment you started liking me?",
    "Tell me the sweetest romantic thought you had about me.",
    "Describe our ideal first date if we went out 🌹",
    "What song plays in your head when you think of me? 🎶",
    "If you had 10 minutes alone with me, what would you say?",
    "Are you someone I talk to every day or someone from afar?",
    "What is the biggest hint you've dropped that I totally missed?",
    "Tell me your favorite photo or story of mine.",
    "If I guess who you are in 3 tries, will you admit it?",
    "What's a cute nickname you'd give me?",
    "Tell me what you love most about my voice or laugh.",
    "Have you ever gotten butterflies when talking to me? 🦋",
    "What's the closest we've ever stood next to each other?",
    "Tell me something that makes your heart race about me.",
    "If we held hands right now, how would you react?",
    "Give me 2 truths and a lie about who you are!",
    "What's your zodiac sign and how long have you liked me?",
    "Do you think I have any idea that you like me?",
    "Write me a mini anonymous love note 💌",
    "What would be our couple aesthetic?",
    "Tell me what you'd do if you found out I liked you back.",
    "Leave the initial of your first name or grade/workplace.",
    "What's the best compliment you could give your secret crush?",
    "Drop your secret admirer confession before I find out!",
    "Send a secret crush message — completely encrypted & safe ❤️"
  ],

  compliment: [
    "Send me a sweet compliment anonymously ✨",
    "What is your favorite memory or quality about me?",
    "Drop some wholesome positivity my way! 💖",
    "What is something you find genuinely inspiring about me?",
    "Tell me something about me that always brightens your day.",
    "What is the kindest thing you've ever seen me do?",
    "Tell me why you're glad I'm in your life or world.",
    "What's the most attractive trait I have (personality or looks)?",
    "Send me a hype message to boost my energy today! 🚀",
    "What is something about my smile that makes people happy?",
    "Tell me one thing you think I'm uniquely talented at.",
    "What's a compliment you think I don't hear often enough?",
    "If you could give me an award for anything, what would it be? 🏆",
    "Tell me about a time I made you feel welcome or heard.",
    "What's the best advice I ever gave you without realizing it?",
    "Compliment my style, humor, or work ethic!",
    "What is something you wish you had that I naturally have?",
    "Tell me what makes me special to the people around me.",
    "Drop a wholesome message that will make me smile all day 😊",
    "What's one thing you admire about the way I carry myself?",
    "Tell me why you think I deserve good things in life.",
    "What makes our dynamic or my presence comforting to you?",
    "Send an anonymous compliment to remind me I'm appreciated.",
    "What's the best compliment someone could give me?",
    "Tell me how I've positively impacted your day or year.",
    "You are doing amazing because: ...",
    "Drop an anonymous bundle of good vibes and love ✨",
    "What is something beautiful about the way I think?",
    "Tell me one reason you're proud of me.",
    "Send an anonymous kind word — thank you for being you!"
  ],

  roast: [
    "Give me your funniest anonymous roast 🔥",
    "Don't hold back, roast me with your best shot!",
    "What is my most roast-worthy habit or trait?",
    "Roast my music taste, outfit choices, or screen time 💀",
    "If I were a character in a comedy show, who would I be?",
    "What's something silly I do that everyone secretly laughs at?",
    "Give me your best 1-line burn that will leave me speechless 😂",
    "Roast my texting habits or response time!",
    "What's the most dramatic thing I've ever made a fuss about?",
    "If you had to roast my walking, talking, or laughing style...",
    "What's a funny roast about my sleep schedule or caffeine addiction?",
    "Roast my cooking skills (or lack thereof) 🍳",
    "What's the goofiest mistake you've ever witnessed me make?",
    "Roast my taste in movies or TV shows!",
    "If my life were a meme, which one would it be?",
    "Give me a roast so spicy I'll need a glass of milk 🥛🔥",
    "What is a harmless roast you've been itching to drop?",
    "Roast my fashion era from 2 years ago vs now 😂",
    "What's my biggest 'clown moment' that you remember?",
    "Roast my excuses for being late or procrastinating.",
    "If you were a stand-up comedian roasting me on stage, what would you open with?",
    "Roast my playlist or the songs I think are 'underrated' 🎧",
    "What's a habit of mine that makes you want to facepalm? 🤦",
    "Roast my gaming, driving, or dancing skills!",
    "Tell me the most brutal roast your brain can formulate.",
    "Roast my aesthetic without holding anything back.",
    "If you had to rate my roasts vs your roasts, how bad do I lose?",
    "Drop your wittiest roast and let me see if I can take the heat 🔥",
    "Roast me, but make it creative and hilarious!",
    "Anonymous roast session is open — fire away! 💀🔥"
  ]
};

/**
 * Returns a random prompt template for a given mode.
 * If previousPrompt is provided, avoids returning the exact same prompt if possible.
 */
export function getRandomPromptForMode(modeId: WhisperModeId, previousPrompt?: string): string {
  const list = MODE_TEMPLATES[modeId] || MODE_TEMPLATES.anonymous;
  if (!list || list.length === 0) return "Send me an anonymous message...";
  
  if (list.length === 1) return list[0];
  
  let candidates = list;
  if (previousPrompt) {
    const filtered = list.filter(p => p.trim().toLowerCase() !== previousPrompt.trim().toLowerCase());
    if (filtered.length > 0) candidates = filtered;
  }
  
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

/**
 * Returns the next prompt in sequence from the 30 templates for a given mode.
 */
export function getNextPromptForMode(modeId: WhisperModeId, currentPrompt?: string): string {
  const list = MODE_TEMPLATES[modeId] || MODE_TEMPLATES.anonymous;
  if (!list || list.length === 0) return "Send me an anonymous message...";
  
  if (!currentPrompt) return list[0];
  
  const currentIndex = list.findIndex(p => p.trim().toLowerCase() === currentPrompt.trim().toLowerCase());
  if (currentIndex === -1 || currentIndex === list.length - 1) {
    return list[0];
  }
  return list[currentIndex + 1];
}

/**
 * Constructs a full share URL for a given mode and optional custom prompt.
 */
export function buildModeShareUrl(
  mode: { pathPrefix: string; prompt: string },
  username: string,
  customPrompt?: string,
  origin?: string
): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const cleanUsername = encodeURIComponent(username);
  const basePath = `${base}/${mode.pathPrefix}/${cleanUsername}`;
  
  if (customPrompt && customPrompt.trim() && customPrompt.trim() !== mode.prompt.trim()) {
    return `${basePath}?p=${encodeURIComponent(customPrompt.trim())}`;
  }
  return basePath;
}
