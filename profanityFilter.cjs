/**
 * CommonJS wrapper for profanity filter — used by server.js (Socket.IO server).
 * This file mirrors the logic from src/lib/profanityFilter.ts.
 */

const BAD_WORDS = new Set([
  "2g1c","2 girls 1 cup","acrotomophilia","alabama hot pocket","alaskan pipeline",
  "anal","anilingus","anus","apeshit","arsehole","ass","asshole","assmunch",
  "auto erotic","autoerotic","babeland","baby batter","baby juice","ball gag",
  "ball gravy","ball kicking","ball licking","ball sack","ball sucking","bangbros",
  "bangbus","bareback","barely legal","barenaked","bastard","bastardo","bastinado",
  "bbw","bdsm","beaner","beaners","beaver cleaver","beaver lips","beastiality",
  "bestiality","big black","big breasts","big knockers","big tits","bimbos",
  "birdlock","bitch","bitches","black cock","blonde action","blonde on blonde action",
  "blowjob","blow job","blow your load","blue waffle","blumpkin","bollocks",
  "bondage","boner","boob","boobs","booty call","brown showers","brunette action",
  "bukkake","bulldyke","bullet vibe","bullshit","bung hole","bunghole","busty",
  "butt","buttcheeks","butthole","camel toe","camgirl","camslut","camwhore",
  "carpet muncher","carpetmuncher","chocolate rosebuds","cialis","circlejerk",
  "cleveland steamer","clit","clitoris","clover clamps","clusterfuck","cock",
  "cocks","coprolagnia","coprophilia","cornhole","coon","coons","creampie",
  "cum","cumming","cumshot","cumshots","cunnilingus","cunt","darkie","date rape",
  "daterape","deep throat","deepthroat","dendrophilia","dick","dildo","dingleberry",
  "dingleberries","dirty pillows","dirty sanchez","doggie style","doggiestyle",
  "doggy style","doggystyle","dog style","dolcett","domination","dominatrix",
  "dommes","donkey punch","double dong","double penetration","dp action","dry hump",
  "dvda","eat my ass","ecchi","ejaculation","erotic","erotism","escort","eunuch",
  "fag","faggot","fecal","felch","fellatio","feltch","female squirting","femdom",
  "figging","fingerbang","fingering","fisting","foot fetish","footjob","frotting",
  "fuck","fuck buttons","fuckin","fucking","fucktards","fudge packer","fudgepacker",
  "futanari","gangbang","gang bang","gay sex","genitals","giant cock","girl on",
  "girl on top","girls gone wild","goatcx","goatse","god damn","gokkun",
  "golden shower","goodpoop","goo girl","goregasm","grope","group sex","g-spot",
  "guro","hand job","handjob","hard core","hardcore","hentai","homoerotic",
  "honkey","hooker","horny","hot carl","hot chick","how to kill","how to murder",
  "huge fat","humping","incest","intercourse","jack off","jail bait","jailbait",
  "jelly donut","jerk off","jigaboo","jiggaboo","jiggerboo","jizz","juggs",
  "kike","kinbaku","kinkster","kinky","knobbing","leather restraint",
  "leather straight jacket","lemon party","livesex","lolita","lovemaking",
  "make me come","male squirting","masturbate","masturbating","masturbation",
  "menage a trois","milf","missionary position","mong","motherfucker",
  "mound of venus","mr hands","muff diver","muffdiving","nambla","nawashi",
  "negro","neonazi","nigga","nigger","nig nog","nimphomania","nipple","nipples",
  "nsfw","nsfw images","nude","nudity","nutten","nympho","nymphomania","octopussy",
  "omorashi","one cup two girls","one guy one jar","orgasm","orgy","paedophile",
  "paki","panties","panty","pedobear","pedophile","pegging","penis","phone sex",
  "piece of shit","pikey","pissing","piss pig","pisspig","playboy","pleasure chest",
  "pole smoker","ponyplay","poof","poon","poontang","punany","poop chute",
  "poopchute","porn","porno","pornography","prince albert piercing","pthc","pubes",
  "pussy","queaf","queef","quim","raghead","raging boner","rape","raping",
  "rapist","rectum","reverse cowgirl","rimjob","rimming","rosy palm",
  "rosy palm and her 5 sisters","rusty trombone","sadism","santorum","scat",
  "schlong","scissoring","semen","sex","sexcam","sexo","sexy","sexual",
  "sexually","sexuality","shaved beaver","shaved pussy","shemale","shibari",
  "shit","shitblimp","shitty","shota","shrimping","skeet","slanteye","slut",
  "s&m","smut","snatch","snowballing","sodomize","sodomy","spastic","spic",
  "splooge","splooge moose","spooge","spread legs","spunk","strap on","strapon",
  "strappado","strip club","style doggy","suck","sucks","suicide girls",
  "sultry women","swastika","swinger","tainted love","taste my","tea bagging",
  "threesome","throating","thumbzilla","tied up","tight white","tit","tits",
  "titties","titty","tongue in a","topless","tosser","towelhead","tranny",
  "tribadism","tub girl","tubgirl","tushy","twat","twink","twinkie",
  "two girls one cup","undressing","upskirt","urethra play","urophilia",
  "vagina","venus mound","viagra","vibrator","violet wand","vorarephilia",
  "voyeur","voyeurweb","voyuer","vulva","wank","wetback","wet dream",
  "white power","whore","worldsex","wrapping men","wrinkled starfish","xxx",
  "yaoi","yellow showers","yiffy","zoophilia",
  // Bengali profanity (Bengali script)
  "বেশ্যা","খানকি","মাগী","বাল","চুতমারানী","চোদা","চোদাচুদি","ভোদা",
  "পুটকি","রেন্ডী","গুদ","গান্ড","গান্ডু","চোদ","মাদারচোদ","বালের চোদ",
  "পেলে","হারামি","পোলা","পুত","মুইরা","সামা","তাল","কুত্তা",
  "কুত্তার বাচ্চা","শুয়োর","শুয়োরের বাচ্চা","পাগল","রান্ধা","রান্ধনি",
  "বাউড়ি","চোর","চোরা","ডাকাত","গুণ্ডা","লাঞ্ছনা","নোংরা","জঘন্য",
  "বেহায়া","মূর্খ","বদমাশ","জাহাল","জাহিল",
  "পোঁদ","পোদ্দার","তোতা","খসখসে","বেশ্যাপুত","বেশ্যাকে","মাদক",
  "নশাল","জারজ","অবৈধ","হিজড়া","ক্রসড্রেসার","ছাগল","ছাগলনাচ",
  "গাধা","গাধানাচ","বোঝা","বোঝারক","পাগলাটে","পাগলখানা",
  // Banglish / Romanized Bengali profanity
  "bessha","khanki","magi","magir","bal","chutmarani","choda","chodachudi",
  "voda","putki","rendi","gud","gand","gandu","sama","pute",
  "madarchod","balerchod","chodaichudi","maslanchi","maslanchod",
  "harami","pola","pote","kutta","kuttarbacha","shuer","shuerbacha",
  "byshya","khenki","mari","balercchod","lancha","nongra",
  "behaia","murkho","badmash","jahal","jahil","jorja",
  "pot","poda","totla","khasskhass","byshapute","jaj","nashila",
  "besshi","kanki","magirbaccha","balchoda","chuta","chudachudi",
  "bhoda","putkiki","rendir","gudgand","sandhi","peldi",
  "maichod","balchod","samacche","beshaputi","totakami",
  "kuttakami","shuor","polakami","gandukami","chudakami",
  "besshak","khankir","magirchele","balichele","putkir","rendichele",
  "madarch","baler","chodar","gandir","khankirbaccha",
  "balira","chodara","vodaichudi","gudir",
  "samar","potir","jorjar","nashik","haramir","jahalr","jahilr",
  "behenchod","behenchud","madarchud","balerchud","chudmarani",
  "beshash","khenkir","magiachele","baliraichele","chuti","chudir",
  "gandirbaccha","samacche","putir","rendichele","kutir",
  "madarchood","balchud","chodchudi","beshyapute","gandichudi",
  "peldichele","maslanchir","totlakami","jajir","jorjir",
  "mairchod","mairchud","chupakami","chupakari","lanchirbaccha",
]);

const PHRASES = [
  "ass hole","asshole","mother fucker","motherfucker","fuck you","fuck off",
  "shut up","go to hell","son of a bitch","piece of shit","bull shit",
  "bullshit","jack off","jerk off","blow job","blowjob","rim job","rimjob",
  "hand job","handjob","finger fuck","fingerfuck","fist fuck","fistfuck",
  "gang bang","gangbang","booty call","bootycall","date rape","daterape",
  "deep throat","deepthroat","golden shower","goldenshower","group sex",
  "phone sex","phonesex","cyber sex","cybersex","tongue in a","two girls one cup",
  "2 girls 1 cup","one cup two girls","one guy one jar","doggy style",
  "doggie style","dog style","camel toe","cameltoe","carpet muncher",
  "carpetmuncher","dirty sanchez","cleveland steamer","donkey punch",
  "double penetration","leather restraint","leather straight jacket",
  "rosy palm","rosy palm and her 5 sisters","suicide girls",
  "strap on","spread legs","suck me","eat my ass","eat me",
  "piece of crap","piece of shit","hot dog","big tits","big breasts",
  "barely legal","tied up","tight white","how to kill","how to murder",
  "blue waffle","blue waffles",
];

function isBengali(text) {
  return /[\u0980-\u09FF]/.test(text);
}

function buildRegex() {
  const allWords = [...PHRASES, ...Array.from(BAD_WORDS)]
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)
    .sort((a, b) => b.length - a.length);

  const escaped = allWords.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  const asciiWords = [];
  const bengaliWords = [];

  for (const w of escaped) {
    if (isBengali(w)) {
      bengaliWords.push(w);
    } else {
      asciiWords.push(w);
    }
  }

  const parts = [];

  if (asciiWords.length > 0) {
    parts.push(`\\b(?:${asciiWords.join('|')})\\b`);
  }

  if (bengaliWords.length > 0) {
    parts.push(`(?<![\\u0980-\\u09FF])(?:${bengaliWords.join('|')})(?![\\u0980-\\u09FF])`);
  }

  return new RegExp(`(?:${parts.join('|')})`, 'gi');
}

let cachedRegex = null;

function getRegex() {
  if (!cachedRegex) {
    cachedRegex = buildRegex();
  }
  return cachedRegex;
}

function filterProfanity(text) {
  const regex = getRegex();
  regex.lastIndex = 0;
  return text.replace(regex, (match) => '*'.repeat(match.length));
}

module.exports = { filterProfanity };
