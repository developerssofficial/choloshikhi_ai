/**
 * Profanity filter — combines word lists from:
 * - LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 * - s21sd/Profanity
 *
 * Replaces bad words with asterisks (****) matching the word length.
 */

// Combined and deduplicated bad word list from both repos
const BAD_WORDS = new Set<string>([
  // === LDNOOBW list (~500 words) ===
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

  // === s21sd/Profanity list (additional words not in LDNOOBW) ===
  "abortion","abuse","adult","alligatorbait","amateur","analannie","analsex",
  "angie","arab","arabs","areola","argie","aroused","arse","assassin",
  "assassinate","assassination","assault","assbagger","assblaster","assclown",
  "asscowboy","asses","assfuck","assfucker","asshat","assholes","asshore",
  "assjockey","asskiss","asskisser","assklown","asslick","asslicker","asslover",
  "assman","assmonkey","assmuncher","asspacker","asspirate","asspuppies",
  "assranger","asswhore","asswipe","athletesfoot","attack","australian","babe",
  "babies","backdoor","backdoorman","backseat","badfuck","balllicker","balls",
  "ballsack","banging","baptist","barelylegal","barf","barface","barfface",
  "bast","bazongas","bazooms","beast","beastality","beastial","beatoff",
  "beat - off","beatyourmeat","beaver","bestial","bi","biatch","bible",
  "bicurious","bigass","bigbastard","bigbutt","bigger","bisexual","bi - sexual",
  "bitcher","bitchez","bitchin","bitching","bitchslap","bitchy","biteme",
  "black","blackman","blackout","blacks","blind","blow","boang","bogan",
  "bohunk","bollick","bollock","bomb","bombers","bombing","bombs","bomd",
  "boner","bong","boobies","booby","boody","boom","boong","boonga","boonie",
  "booty","bootycall","bountybar","bra","brea5t","breast","breastjob",
  "breastlover","breastman","brothel","bugger","buggered","buggery","bullcrap",
  "bulldike","bumblefuck","bumfuck","bunga","buried","burn","butchbabes",
  "butchdike","butchdyke","buttbang","butt - bang","buttface","buttfuck",
  "butt - fuck","buttfucker","butt - fucker","buttfuckers","butt - fuckers",
  "butthead","buttman","buttmunch","buttmuncher","buttpirate","buttplug",
  "buttstain","byatch","cacker","cameljockey","cameltoe","canadian","cancer",
  "carpetmuncher","carruth","catholic","catholics","cemetery","chav",
  "cherrypopper","chickslick","children's","chin","chinaman","chinamen",
  "chinese","chink","chinky","choad","chode","christ","christian","church",
  "cigarette","cigs","clamdigger","clamdiver","clogwog","cocaine","cockblock",
  "cockblocker","cockcowboy","cockfight","cockhead","cockknob","cocklicker",
  "cocklover","cocknob","cockqueen","cockrider","cocksman","cocksmith",
  "cocksmoker","cocksucer","cocksuck ","cocksucked ","cocksucker",
  "cocksucking","cocktail","cocktease","cocky","cohee","coitus","color",
  "colored","coloured","commie","communist","condom","conservative","conspiracy",
  "coolie","cooly","coondog","copulate","cornhole","corruption","cra5h","crabs",
  "crack","crackpipe","crackwhore","crack - whore","crap","crapola","crapper",
  "crappy","crash","creamy","crime","crimes","criminal","criminals","crotch",
  "crotchjockey","crotchmonkey","crotchrot","cumbubble","cumfest","cumjockey",
  "cumm","cummer","cumquat","cumqueen","cunilingus","cunillingus","cunn",
  "cunntt","cunteyed","cuntfuck","cuntfucker","cuntlick ","cuntlicker ",
  "cuntlicking ","cuntsucker","cybersex","cyberslimer","dago","dahmer","dammit",
  "damn","damnation","damnit","darkie","darky","datnigga","dead","deapthroat",
  "death","deepthroat","defecate","dego","demon","deposit","desire","destroy",
  "deth","devil","devilworshipper","dickbrain","dickforbrains","dickhead",
  "dickless","dicklick","dicklicker","dickman","dickwad","dickweed","diddle",
  "die","died","dies","dike","dingleberry","dink","dipshit","dipstick","dirty",
  "disease","diseases","disturbed","dive","dix","dixiedike","dixiedyke",
  "dong","doodoo","doo - doo","doom","dope","dragqueen","dragqween","dripdick",
  "drug","drunk","drunken","dumb","dumbass","dumbbitch","dumbfuck","dyefly",
  "dyke","easyslut","eatballs","eatme","eatpussy","ecstacy","ejaculate",
  "ejaculated","ejaculating","ejaculation","enema","enemy","erect","erection",
  "ero","escort","ethiopian","ethnic","european","evl","excrement","execute",
  "executed","execution","executioner","explosion","facefucker","faeces","fagging",
  "fagot","fairies","fannyfucker","fastfuck","fat","fatah","fatass","fatfuck",
  "fatfucker","fatso","fckcum","fear","feces","felatio ","felch","felcher",
  "felching","feltcher","feltching","fetish","fight","filipina","filipino",
  "fingerfood","fingerfuck ","fingerfucked ","fingerfucker ","fingerfuckers",
  "fingerfucking ","fire","firing","fister","fistfuck","fistfucked ",
  "fistfucker ","fistfucking ","fisting","flange","flasher","flatulence","floo",
  "flydie","flydye","fok","fondle","footaction","footfuck","footfucker",
  "footlicker","footstar","fore","foreskin","forni","fornicate","foursome",
  "fourtwenty","fraud","freakfuck","freakyfucker","freefuck","fu","fubar","fuc",
  "fucck","fucka","fuckable","fuckbag","fuckbuddy","fucked","fuckedup","fucker",
  "fuckers","fuckface","fuckfest","fuckfreak","fuckfriend","fuckhead","fuckher",
  "fuckin","fuckina","fuckingbitch","fuckinnuts","fuckinright","fuckit",
  "fuckknob","fuckme ","fuckmehard","fuckmonkey","fuckoff","fuckpig","fucks",
  "fucktard","fuckwhore","fuckyou","fugly","fuk","fuks","funeral","funfuck",
  "fungus","fuuck","gangbanged ","gangbanger","gangsta","gatorbait","gay",
  "gaymuthafuckinwho,re","gaysex ","geez","geezer","geni","genital","german",
  "getiton","gin","ginzo","gipp","girls","givehead","glazeddonut","gob",
  "godammit","goddamit","goddammit","goddamn","goddamned","goddamnes",
  "goddamnit","goddamnmuthafucke,r","goldenshower","gonorrehea","gonzagas",
  "gook","gotohell","goy","goyim","greaseball","gringo","groe","gross",
  "grostulation","gubba","gummer","gun","gyp","gypo","gypp","gyppie","gyppo",
  "gyppy","hamas","handjob","hapa","harder","hardon","harem","headfuck",
  "headlights","hebe","heeb","hell","henhouse","heroin","herpes","heterosexual",
  "hijack","hijacker","hijacking","hillbillies","hindoo","hiscock","hitler",
  "hitlerism","hitlerist","hiv","ho","hobo","hodgie","hoes","hole",
  "holestuffer","homicide","homo","homobangers","homosexual","honger","honk",
  "honkers","honky","hook","hookers","hooters","hore","hork","horn","horney",
  "horniest","horseshit","hosejob","hoser","hostage","hotdamn","hotpussy",
  "hottotrot","hummer","husky","hussy","hustler","hymen","hymie","iblowu",
  "idiot","ikey","illegal","incest","insest","intercourse","interracial",
  "intheass","inthebuff","israel","israeli","israel's","italiano","itch",
  "jackass","jackoff","jackshit","jacktheripper","jade","jap","japcrap","jebus",
  "jeez","jerkoff","jesus","jesuschrist","jew","jewish","jiga","jiggaboo",
  "jigg","jigga","jiggabo","jigger ","jiggy","jihad","jijjiboo","jimfish",
  "jism","jiz ","jizim","jizjuice","jizm ","jizz","jizzim","jizzum","joint",
  "juggalo","jugs","junglebunny","kaffer","kaffir","kaffre","kafir","kanake",
  "kid","kigger","kike","kill","killed","killer","killing","kills","kink",
  "kissy","kissass","knockers","kock","kondum","koon","kotex","krap","krappy",
  "kraut","kum","kumbubble","kumbullbe","kummer","kumming","kumquat","kums",
  "kunilingus","kunnilingus","kunt","ky","kyke","lactate","laid","lapdance",
  "latin","lesbain","lesbayn","lesbian","lesbin","lesbo","lez","lezbe",
  "lezbefriends","lezbo","lezz","lezzo","liberal","libido","licker","lickme",
  "lies","limey","limpdick","limy","lingerie","liquor","livesex","loadedgun",
  "lolita","looser","loser","lotion","lovebone","lovegoo","lovegun","lovejuice",
  "lovemuscle","lovepistol","loverocket","lowlife","lsd","lubejob","lucifer",
  "luckycammeltoe","lugan","lynch","macaca","mad","mafia","magicwand","mams",
  "manhater","manpaste","marijuana","mastabate","mastabater","masterbate",
  "masterblaster","mastrabator","masturbate","masturbating","mattressprincess",
  "meatbeatter","meatrack","meth","mexican","mgger","mggor","mickeyfinn",
  "mideast","milf","minority","mockey","mockie","mocky","mofo","moky","moles",
  "molest","molestation","molester","molestor","moneyshot","mooncricket",
  "mormon","moron","moslem","mosshead","mothafuck","mothafucka","mothafuckaz",
  "mothafucked","mothafucker","mothafuckin","mothafucking","mothafuckings",
  "motherfuck","motherfucked","motherfucker","motherfuckin","motherfucking",
  "motherfuckings","motherlovebone","muff","muffdive","muffdiver","muffindiver",
  "mufflikcer","mulatto","muncher","munt","murder","murderer","muslim","naked",
  "narcotic","nasty","nastybitch","nastyho","nastyslut","nastywhore","nazi",
  "necro","negroes","negroid","negro's","nig","niger","nigg","niggah",
  "niggaracci","niggard","niggarded","niggarding","niggardliness",
  "niggardliness's","niggardly","niggards","niggard's","niggaz","niggerhead",
  "niggerhole","niggers","nigger's","niggle","niggled","niggles","niggling",
  "nigglings","niggor","niggur","niglet","nignog","nigr","nigra","nigre",
  "nip","nipple","nipplering","nittit","nlgger","nlggor","nofuckingway",
  "nook","nookey","nookie","noonan","nooner","nude","nudger","nuke",
  "nutfucker","nymph","ontherag","oral","orga","orgasim","orgasm","orgies",
  "orgy","osama","paki","palesimian","palestinian","pansies","pansy","panti",
  "panties","payo","pearlnecklace","peck","pecker","peckerwood","pee",
  "peehole","pee - pee","peepshow","peepshpw","pendy","penetration","peni5",
  "penile","penis","penises","penthouse","period","perv","phonesex","phuk",
  "phuked","phuking","phukked","phukking","phungky","phuq","pi55","picaninny",
  "piccaninny","pickaninny","piker","pikey","piky","pimp","pimped","pimper",
  "pimpjuic","pimpjuice","pimpsimp","pindick","piss","pissed","pisser",
  "pisses","pisshead","pissin","pissing","pissoff","pistol","pixie","pixy",
  "playboy","playgirl","pocha","pocho","pocketpool","pohm","polack","pom",
  "pommie","pommy","poo","poon","poontang","poop","pooper","pooperscooper",
  "pooping","poorwhitetrash","popimp","porchmonkey","porn","pornflick",
  "pornking","porno","pornography","pornprincess","pot","poverty","premature",
  "pric","prick","prickhead","primetime","propaganda","pros","prostitute",
  "protestant","pu55i","pu55y","pube","pubic","pubiclice","pud","pudboy",
  "pudd","puddboy","puke","puntang","purinapricness","puss","pussie",
  "pussies","pussycat","pussyeater","pussyfucker","pussylicker","pussylips",
  "pussylover","pussypounder","pusy","quashie","queef","queer","quickie",
  "quim","ra8s","rabbi","racial","racist","radical","radicals","raghead",
  "randy","rape","raped","raper","rapist","rearend","rearentry","rectum",
  "redlight","redneck","reefer","reestie","refugee","reject","remains",
  "rentafuck","republican","rere","retard","retarded","ribbed","rigger",
  "rimjob","rimming","roach","robber","roundeye","rump","russki","russkie",
  "sadis","sadom","samckdaddy","sandm","sandnigger","satan","scag","scallywag",
  "scat","schlong","screw","screwyou","scrotum","semen","sex","sexcam","sexo",
  "sexy","sexual","sexually","sexuality","shaved beaver","shaved pussy",
  "shemale","shibari","shit","shitblimp","shitty","shota","shrimping","skeet",
  "slanteye","slut","s&m","smut","snatch","snowballing","sodomize","sodomy",
  "spastic","spic","splooge","splooge moose","spooge","spread legs","spunk",
  "strap on","strapon","strappado","strip club","style doggy","suck","sucks",
  "suicide girls","sultry women","swastika","swinger","tainted love",
  "taste my","tea bagging","threesome","throating","thumbzilla","tied up",
  "tight white","tit","tits","titties","titty","tongue in a","topless",
  "tosser","towelhead","tranny","tribadism","tub girl","tubgirl","tushy",
  "twat","twink","twinkie","two girls one cup","undressing","upskirt",
  "urethra play","urophilia","vagina","venus mound","viagra","vibrator",
  "violet wand","vorarephilia","voyeur","voyeurweb","voyuer","vulva","wank",
  "wetback","wet dream","white power","whore","worldsex","wrapping men",
  "wrinkled starfish","xxx","yaoi","yellow showers","yiffy","zoophilia",

  // === Bengali profanity (Bengali script) ===
  "বেশ্যা","খানকি","মাগী","বাল","চুতমারানী","চোদা","চোদাচুদি","ভোদা",
  "পুটকি","রেন্ডী","গুদ","গান্ড","গান্ডু","চোদ","মাদারচোদ","বালের চোদ",
  "পেলে","হারামি","পোলা","পুত","মুইরা","সামা","তাল","কুত্তা",
  "কুত্তার বাচ্চা","শুয়োর","শুয়োরের বাচ্চা","পাগল","রান্ধা","রান্ধনি",
  "বাউড়ি","চোর","চোরা","ডাকাত","গুণ্ডা","লাঞ্ছনা","নোংরা","জঘন্য",
  "বেহায়া","মূর্খ","বদমাশ","জাহাল","জাহিল",
  // More Bengali slurs
  "পোঁদ","পোদ্দার","তোতা","খসখসে","বেশ্যাপুত","বেশ্যাকে","মাদক",
  "নশাল","জারজ","অবৈধ","হিজড়া","ক্রসড্রেসার","ছাগল","ছাগলনাচ",
  "গাধা","গাধানাচ","বোঝা","বোঝারক","পাগলাটে","পাগলখানা",

  // === Banglish / Romanized Bengali profanity ===
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
  "besshak","khankir","magirchele","balichele","putkir","rendirbaccha",
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

// Multi-word phrases that need special handling
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

/**
 * Normalize text for matching: lowercase, remove special chars between letters
 */
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Check if a character is Bengali (Unicode block U+0980–U+09FF).
 */
function isBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * Create a regex pattern that matches any bad word as a whole word.
 * Handles both ASCII (\\b) and Bengali script (custom boundary) words.
 */
function buildRegex(): RegExp {
  // Sort phrases by length (longest first)
  const allWords = [...PHRASES, ...Array.from(BAD_WORDS)]
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)
    .sort((a, b) => b.length - a.length);

  const escaped = allWords.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Split into ASCII-only words and Bengali words
  const asciiWords: string[] = [];
  const bengaliWords: string[] = [];

  for (const w of escaped) {
    if (isBengali(w)) {
      bengaliWords.push(w);
    } else {
      asciiWords.push(w);
    }
  }

  const parts: string[] = [];

  // ASCII words: use standard \b word boundary
  if (asciiWords.length > 0) {
    parts.push(`\\b(?:${asciiWords.join('|')})\\b`);
  }

  // Bengali words: use custom boundary — must not be surrounded by Bengali letters
  // This prevents matching substrings inside longer Bengali words
  if (bengaliWords.length > 0) {
    parts.push(`(?<![\\u0980-\\u09FF])(?:${bengaliWords.join('|')})(?![\\u0980-\\u09FF])`);
  }

  return new RegExp(`(?:${parts.join('|')})`, 'gi');
}

// Pre-compiled regex (built once on module load)
let cachedRegex: RegExp | null = null;

function getRegex(): RegExp {
  if (!cachedRegex) {
    cachedRegex = buildRegex();
  }
  return cachedRegex;
}

/**
 * Check if text contains any profanity.
 */
export function containsProfanity(text: string): boolean {
  const regex = getRegex();
  regex.lastIndex = 0;
  return regex.test(text);
}

/**
 * Replace profanity in text with asterisks (****).
 * Each bad word is replaced with same-length stars.
 * e.g., "fuck" → "****", "shit" → "****"
 */
export function filterProfanity(text: string): string {
  const regex = getRegex();
  regex.lastIndex = 0;

  return text.replace(regex, (match) => {
    // Replace each character with * (preserve length)
    return '*'.repeat(match.length);
  });
}

/**
 * Check if a message contains profanity and return the filtered version.
 * Returns { hasProfanity, filtered } for flexible usage.
 */
export function checkProfanity(text: string): { hasProfanity: boolean; filtered: string } {
  const regex = getRegex();
  regex.lastIndex = 0;

  const hasProfanity = regex.test(text);
  if (!hasProfanity) {
    return { hasProfanity: false, filtered: text };
  }

  regex.lastIndex = 0;
  const filtered = text.replace(regex, (match) => '*'.repeat(match.length));
  return { hasProfanity: true, filtered };
}
