const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
name: "اوامر",
version: "2.0.0",
hasPermssion: 0,
credits: "سواد البغدادي",
description: "ألعاب متنوعة + رصيد ورهانات",
commandCategory: "🎮 الألعاب",
usages: "games [اسم اللعبة]",
cooldowns: 3,
};

const dataFile = __dirname + "/games_balance.json";
const bannedUsersFile = __dirname + "/games_banned_users.json";
const DEVELOPER_ID = "100015903097543";

const emojiList = ["😂", "😍", "🔥", "💀", "🥶", "🤡", "😎", "😡"];
const animeNames = ["لوفي", "ناروتو", "غوكو", "إيتاشي", "زورو"];
const difficultWords = ["إستعصاء", "استراتيجية", "متناقضات", "استكشاف"];
const countriesStartingWithS = ["سوريا", "السودان", "الصومال", "سلطنة عمان", "السعودية"];
const lockCodes = {};

let activeGame = {};

// 💰 تحميل أو إنشاء ملف الرصيد
function getBalance() {
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));
return JSON.parse(fs.readFileSync(dataFile));
}
function saveBalance(data) {
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 🚫 تحميل أو إنشاء ملف المستخدمين المحظورين
function getBannedUsers() {
if (!fs.existsSync(bannedUsersFile)) fs.writeFileSync(bannedUsersFile, JSON.stringify([]));
return JSON.parse(fs.readFileSync(bannedUsersFile));
}
function saveBannedUsers(data) {
fs.writeFileSync(bannedUsersFile, JSON.stringify(data, null, 2));
}

// ⏱️ دالة مساعدة لإرسال الرسائل بعد تأخير
function sendMessageWithDelay(api, message, threadID, messageID, delay = 6000) {
    setTimeout(() => {
        api.sendMessage(message, threadID, messageID);
    }, delay);
}

// ⏱️ دالة مساعدة لبدء الألعاب مع تأخير وإعادة تشغيلها
function startGameWithDelay(api, gameInfo, threadID, messageID, delay = 6000) {
    setTimeout(() => {
        api.sendMessage(gameInfo.question, threadID, (err, info) => {
            activeGame[threadID] = {
                type: gameInfo.type,
                answer: gameInfo.answer,
                messageID: info.messageID,
                winner: null
            };
        });
    }, delay);
}

module.exports.run = async function({ api, event, args }) {
const { threadID, messageID, senderID, mentions, messageReply } = event;
const balance = getBalance();
const bannedUsers = getBannedUsers();

if (bannedUsers.includes(senderID)) {
    console.log(`User ${senderID} is banned and tried to use the command.`);
    return;
}

if (!balance[senderID]) balance[senderID] = 500;

const command = args[0]?.toLowerCase();

if (activeGame[threadID] && command !== "الغاء_اللعبة") {
    sendMessageWithDelay(api, "🚫 هناك لعبة نشطة بالفعل في هذه المحادثة. يرجى الانتظار حتى تنتهي أو استخدام 'games الغاء_اللعبة'.", threadID, messageID, 6000);
    return;
}

if (command === "الغاء_اللعبة") {
    if (activeGame[threadID]) {
        delete activeGame[threadID];
        delete lockCodes[threadID];
        sendMessageWithDelay(api, "✅ تم إلغاء اللعبة النشطة في هذه المحادثة.", threadID, messageID, 6000);
    } else {
        sendMessageWithDelay(api, "❌ لا توجد لعبة نشطة لإلغائها في هذه المحادثة.", threadID, messageID, 6000);
    }
    return;
}

// ========== 🚫 أمر حظر / إلغاء حظر ==========
if (command === "حظر") {
    if (senderID !== DEVELOPER_ID) {
        sendMessageWithDelay(api, "❌ هذا الأمر خاص بالمطور فقط.", threadID, messageID, 6000);
        return;
    }
    const mentionID = Object.keys(mentions)[0];
    if (!mentionID) {
        sendMessageWithDelay(api, `❌ استخدم: games حظر @[الشخص] لحظر مستخدم، أو games حظر إلغاء @[الشخص] لإلغاء الحظر.`, threadID, messageID, 6000);
        return;
    }
    if (args[1]?.toLowerCase() === "إلغاء") {
        const index = bannedUsers.indexOf(mentionID);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            saveBannedUsers(bannedUsers);
            sendMessageWithDelay(api, `✅ تم إلغاء حظر المستخدم @${mentionID} بنجاح.`, threadID, messageID, 6000);
        } else {
            sendMessageWithDelay(api, `❌ المستخدم @${mentionID} ليس محظوراً أصلاً.`, threadID, messageID, 6000);
        }
    } else {
        if (!bannedUsers.includes(mentionID)) {
            bannedUsers.push(mentionID);
            saveBannedUsers(bannedUsers);
            sendMessageWithDelay(api, `✅ تم حظر المستخدم @${mentionID} من استخدام الكود.`, threadID, messageID, 6000);
        } else {
            sendMessageWithDelay(api, `❌ المستخدم @${mentionID} محظور بالفعل.`, threadID, messageID, 6000);
        }
    }
    return;
}

// ========== 💰 رصيدي ==========
if (command === "رصيدي") {
    sendMessageWithDelay(api, `💸 رصيدك الحالي: ${balance[senderID]} SP`, threadID, messageID, 6000);
    return;
}

// ========== ➕ زيادة (محدث) ==========
if (command === "زيادة") {
    if (senderID !== DEVELOPER_ID) {
        sendMessageWithDelay(api, "❌ هذا الأمر خاص بالمطور فقط.", threadID, messageID, 6000);
        return;
    }
    if (!messageReply) {
        sendMessageWithDelay(api, "💡 لزيادة الرصيد، يجب عليك الرد على رسالة الشخص المستهدف مع كتابة 'زيادة [المبلغ]'.", threadID, messageID, 6000);
        return;
    }
    const targetID = messageReply.senderID;
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
        sendMessageWithDelay(api, `❌ الرجاء تحديد مبلغ صحيح للزيادة. مثال: الرد على رسالة الشخص وكتابة 'زيادة 100'.`, threadID, messageID, 6000);
        return;
    }
    if (!balance[targetID]) balance[targetID] = 0;
    balance[targetID] += amount;
    saveBalance(balance);
    sendMessageWithDelay(api, `✅ تم إضافة ${amount} SP إلى @${targetID} (رصيده الآن: ${balance[targetID]} SP)`, threadID, messageID, 6000);
    return;
}

// ========== 🎰 رهان ==========
if (command === "رهان") {
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) {
        sendMessageWithDelay(api, "❌ ضع مبلغ صحيح مثل: games رهان 100", threadID, messageID, 6000);
        return;
    }
    if (balance[senderID] < betAmount) {
        sendMessageWithDelay(api, "🚫 لا تملك رصيد كافي للمراهنة.", threadID, messageID, 6000);
        return;
    }
    const result = Math.random() < 0.5 ? "خسرت" : "ربحت";
    let msg = "";
    if (result === "ربحت") {
        balance[senderID] += betAmount;
        msg = `🎉 مبروك ربحت ${betAmount} SP!\n💰 رصيدك الآن: ${balance[senderID]} SP`;
    } else {
        balance[senderID] -= betAmount;
        msg = `💔 للأسف خسرت ${betAmount} SP\n💰 رصيدك الآن: ${balance[senderID]} SP`;
    }
    saveBalance(balance);
    sendMessageWithDelay(api, msg, threadID, messageID, 6000);
    return;
}

// ========== 🎮 الألعاب الجديدة والمحدثة ==========
if (command === "ايموجي") {
    const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    startGameWithDelay(api, {
        type: "emoji",
        question: `🚨 تحدي سريع!\nأول من يرسل: ${randomEmoji} 🏁`,
        answer: randomEmoji
    }, threadID, messageID, 6000);
    return;
}

if (command === "فكك") {
    const word = animeNames[Math.floor(Math.random() * animeNames.length)];
    const shuffledWord = word.split("").sort(() => 0.5 - Math.random()).join(" ");
    startGameWithDelay(api, {
        type: "fakkak_anime",
        question: `🧩 فكك الكلمة المشفرة إلى اسم أنمي: ${shuffledWord}`,
        answer: word
    }, threadID, messageID, 6000);
    return;
}

if (command === "اكتب") {
    const randomWord = difficultWords[Math.floor(Math.random() * difficultWords.length)];
    startGameWithDelay(api, {
        type: "write_word",
        question: `✍️ أسرع شخص يكتب الكلمة التالية بشكل صحيح: "${randomWord}"`,
        answer: randomWord
    }, threadID, messageID, 6000);
    return;
}

if (command === "رتب") {
    const word = animeNames[Math.floor(Math.random() * animeNames.length)];
    const shuffledLetters = word.split("").sort(() => 0.5 - Math.random()).join(" ");
    startGameWithDelay(api, {
        type: "arrange_word",
        question: `🔄 رتب الحروف لتكون كلمة صحيحة: "${shuffledLetters}"`,
        answer: word
    }, threadID, messageID, 6000);
    return;
}

if (command === "نرد") {
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) {
        sendMessageWithDelay(api, "❌ استخدم: games نرد [المبلغ] للمراهنة.", threadID, messageID, 6000);
        return;
    }
    if (balance[senderID] < betAmount) {
        sendMessageWithDelay(api, "🚫 لا تملك رصيد كافي للمراهنة على النرد.", threadID, messageID, 6000);
        return;
    }
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let msg = `🎲 رميت النرد وجاء الرقم: ${diceRoll}\n`;
    if (diceRoll >= 4) {
        balance[senderID] += betAmount;
        msg += `🎉 مبروك! فزت بـ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
    } else {
        balance[senderID] -= betAmount;
        msg += `💔 للأسف! خسرت ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
    }
    saveBalance(balance);
    sendMessageWithDelay(api, msg, threadID, messageID, 6000);
    return;
}

if (command === "عدد_حروف") {
    const randomWord = difficultWords[Math.floor(Math.random() * difficultWords.length)];
    startGameWithDelay(api, {
        type: "count_letters",
        question: `🔤 ما هو عدد حروف الكلمة التالية: "${randomWord}"؟`,
        answer: randomWord.length.toString()
    }, threadID, messageID, 6000);
    return;
}

if (command === "هدف") {
    const targetEmoji = "🎯";
    startGameWithDelay(api, {
        type: "target_emoji",
        question: `🎯 لعبة الهدف! أول من يرسل الإيموجي: ${targetEmoji} يكسب!`,
        answer: targetEmoji
    }, threadID, messageID, 6000);
    return;
}

if (command === "تخمين_رقم") {
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    startGameWithDelay(api, {
        type: "guess_number",
        question: `🥇 أخفيت رقمًا بين 1 و 10. من يخمّنه أولاً يكسب!`,
        answer: randomNumber.toString()
    }, threadID, messageID, 6000);
    return;
}

if (command === "معكوس") {
    const word = animeNames[Math.floor(Math.random() * animeNames.length)];
    const reversedWord = word.split("").reverse().join("");
    startGameWithDelay(api, {
        type: "reverse_word",
        question: `🧠 ما هو معكوس الكلمة: "${reversedWord}"؟`,
        answer: word
    }, threadID, messageID, 6000);
    return;
}

if (command === "دولة_بحرف") {
    const arabicLetters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
    const randomArabicLetter = arabicLetters[Math.floor(Math.random() * arabicLetters.length)];
    startGameWithDelay(api, {
        type: "country_letter",
        question: `⏱️ أرسل اسم دولة تبدأ بحرف "${randomArabicLetter}" بأسرع وقت!`,
        answer: randomArabicLetter
    }, threadID, messageID, 6000);
    return;
}

if (command === "اختبار_ذكاء") {
    const question = "🧠 إذا كان 1=5 و 2=25، فكم 3؟";
    startGameWithDelay(api, {
        type: "iq_test",
        question: question,
        answer: "3"
    }, threadID, messageID, 6000);
    return;
}

if (command === "افتح_القفل") {
    const code = Math.floor(Math.random() * 900) + 100;
    lockCodes[threadID] = code.toString();
    startGameWithDelay(api, {
        type: "open_lock",
        question: `🔐 رمز القفل من 3 أرقام. حاول تخمينه! مثال: 123`,
        answer: code.toString()
    }, threadID, messageID, 6000);
    return;
}

if (command === "تحدي") {
    const challengedUser = Object.keys(mentions)[0];
    if (!challengedUser || challengedUser === senderID) {
        sendMessageWithDelay(api, "❌ لتحدي لاعب، قم بعمل تاغ للشخص الذي تريد تحديه: games تحدي @[الشخص] [المبلغ].", threadID, messageID, 6000);
        return;
    }
    const betAmount = parseInt(args[2]);
    if (isNaN(betAmount) || betAmount <= 0) {
        sendMessageWithDelay(api, "❌ يجب تحديد مبلغ الرهان في التحدي. مثال: games تحدي @[الشخص] 100.", threadID, messageID, 6000);
        return;
    }
    if (balance[senderID] < betAmount || balance[challengedUser] < betAmount) {
         sendMessageWithDelay(api, "🚫 لا تملك أنت أو خصمك رصيد كافي لهذا التحدي.", threadID, messageID, 6000);
        return;
    }
    setTimeout(() => {
        api.sendMessage({
            body: `⚔️ @${senderID} تحدى @${challengedUser} في نزال نرد على ${betAmount} SP! @${challengedUser}، هل تقبل التحدي؟ (اكتب 'أقبل التحدي' للقبول)`,
            mentions: [{tag: `@${senderID}`, id: senderID}, {tag: `@${challengedUser}`, id: challengedUser}]
        }, threadID, messageID);
        activeGame[threadID] = {
            type: "player_vs_player_challenge",
            challengerID: senderID,
            challengedID: challengedUser,
            bet: betAmount,
            status: "waiting_acceptance",
            messageID: messageID
        };
    }, 6000);
    return;
}

if (command === "فكك_جملة") {
    const sentence = "ناروتو قوي";
    const answer = sentence.split("").join(" ");
    startGameWithDelay(api, {
        type: "fakkak_sentence",
        question: `🧩 فكك الجملة التالية بسرعة: "${sentence}"`,
        answer: answer
    }, threadID, messageID, 6000);
    return;
}

if (command === "أين_تقع") {
    const countriesData = [
        { country: "فنلندا", continent: "أوروبا" },
        { country: "اليابان", continent: "آسيا" },
        { country: "مصر", continent: "أفريقيا" },
        { country: "البرازيل", continent: "أمريكا الجنوبية" }
    ];
    const randomCountry = countriesData[Math.floor(Math.random() * countriesData.length)];
    startGameWithDelay(api, {
        type: "where_is_country",
        question: `🗺️ في أي قارة تقع دولة "${randomCountry.country}"؟`,
        answer: randomCountry.continent
    }, threadID, messageID, 6000);
    return;
}

if (command === "شخصية") {
    const characters = [
        { name: "ناروتو", hint: "نينجا، يرتدي برتقالي، يحب الرامن" },
        { name: "غوكو", hint: "ساياجين، قوي جداً، يأكل كثيراً" },
        { name: "لوفي", hint: "قرصان، جسده مطاطي، يبحث عن الون بيس" }
    ];
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    startGameWithDelay(api, {
        type: "guess_character",
        question: `🕵️‍♂️ من هذه الشخصية؟ تلميح: "${randomCharacter.hint}"`,
        answer: randomCharacter.name
    }, threadID, messageID, 6000);
    return;
}

if (command === "قنبلة") {
    const countdownTime = 10;
    let count = countdownTime;
    setTimeout(() => {
        api.sendMessage(`💣 بدأت لعبة القنبلة! آخر من يرد قبل انتهاء العد التنازلي يخسر! العد التنازلي: ${count}...`, threadID, (err, info) => {
            activeGame[threadID] = { type: "bomb_game", countdown: count, timer: null, lastReplier: null, messageID: info.messageID };
            activeGame[threadID].timer = setInterval(() => {
                count--;
                if (count > 0) {
                    api.sendMessage(`${count}...`, threadID);
                } else {
                    clearInterval(activeGame[threadID].timer);
                    let msg = "";
                    if (activeGame[threadID].lastReplier) {
                         msg = `💥 بوم! انتهى الوقت. الفائز هو @${activeGame[threadID].lastReplier} لأنه رد آخر واحد قبل العد.`;
                    } else {
                        msg = `💥 بوم! لم يرد أحد في الوقت المحدد. انتهت اللعبة بدون فائز.`;
                    }
                    api.sendMessage(msg, threadID);
                    delete activeGame[threadID];
                }
            }, 1000);
        });
    }, 6000);
    return;
}

const userInfo = await api.getUserInfo(senderID);
const userName = userInfo[senderID].name;

const helpMessage = `أهلاً يا ${userName} إليك بعض الأوامر اللتي قد تساعدك:

╭─❍「 💰 الأرصدة والرهانات 」
│ ✧ رصيدي - لعرض رصيدك الحالي.
│ ✧ رهان [مبلغ] - للمراهنة على ربح أو خسارة المبلغ.
│ ✧ bet [مبلغ] - نفس رهان، للمراهنة.
╰───────────⟡
╭─❍「 🎮 ألعاب السرعة والذكاء 」
│ ✧ ايموجي - كن الأسرع في إرسال الإيموجي المطلوب.
│ ✧ اكتب - كن الأسرع في كتابة الكلمة الصحيحة.
│ ✧ رتب - رتب الحروف لتكوين كلمة.
│ ✧ فكك - فكك الكلمة أو الجملة المشفرة.
│ ✧ معكوس - اكتب معكوس الكلمة.
│ ✧ تخمين_رقم - خمن الرقم السري بين 1 و10.
│ ✧ عدد_حروف - كم عدد حروف الكلمة المعطاة؟
│ ✧ هدف - أرسل الإيموجي المستهدف أولاً.
│ ✧ اختبار_ذكاء - سؤال ذكاء سريع.
│ ✧ افتح_القفل - خمن رمز القفل المكون من 3 أرقام.
│ ✧ دولة_بحرف - أرسل اسم دولة تبدأ بحرف معين.
│ ✧ شخصية - خمن الشخصية من التلميح.
│ ✧ أين_تقع - في أي قارة تقع الدولة المذكورة؟
╰───────────⟡
╭─❍「 ⚔️ ألعاب التحدي 」
│ ✧ نرد [مبلغ] - ارمي النرد واربح أو اخسر.
│ ✧ تحدي @[شخص] [مبلغ] - تحدى صديقك في نزال نرد.
│ ✧ قنبلة - لعبة القنبلة، آخر من يرد يخسر!
╰───────────⟡
╭─❍「 🛠️ أوامر المطور (خاص) 」
│ ✧ زيادة (بالرد) [مبلغ] - لزيادة رصيد شخص (عن طريق الرد على رسالته).
│ ✧ حظر @[شخص] - لحظر مستخدم من استخدام الكود.
│ ✧ حظر إلغاء @[شخص] - لإلغاء حظر مستخدم.
╰───────────⟡
╭─❍「 🚫 أوامر عامة 」
│ ✧ الغاء_اللعبة - لإلغاء أي لعبة نشطة.
╰───────────⟡
├─────☾⋆
│ » إجمالي عدد الأوامر : [ 23 ]
│「 سواد البغدادي 」
╰──────────⧕`;

sendMessageWithDelay(api, helpMessage, threadID, messageID, 6000);
};

// 📥 handleEvent للألعاب السريعة
module.exports.handleEvent = function({ api, event }) {
    const { threadID, body, senderID, messageID } = event;
    const bannedUsers = getBannedUsers();
    const balance = getBalance();

    if (bannedUsers.includes(senderID)) {
        return;
    }

    if (!activeGame[threadID]) return;
    const game = activeGame[threadID];
    const userAnswer = body?.trim().toLowerCase();

    if (game.winner && game.winner === senderID) return;

    let isCorrect = false;

    switch (game.type) {
        case "emoji":
        case "target_emoji":
        case "write_word":
        case "guess_number":
        case "reverse_word":
        case "fakkak_anime":
        case "arrange_word":
        case "guess_character":
        case "fakkak_sentence":
        case "where_is_country":
        case "iq_test":
            if (userAnswer === game.answer.toLowerCase()) {
                isCorrect = true;
            }
            break;
        case "count_letters":
            if (userAnswer === game.answer) {
                isCorrect = true;
            }
            break;
        case "country_letter":
            if (userAnswer && userAnswer.startsWith(game.answer.toLowerCase())) {
                isCorrect = true;
            }
            break;
        case "open_lock":
            if (userAnswer === game.answer) {
                isCorrect = true;
            } else {
                const correctDigits = [...game.answer].filter((digit, index) => digit === userAnswer[index]).length;
                api.sendMessage(`❌ خطأ! ${correctDigits} رقم صحيح في مكانه الصحيح.`, threadID, messageID);
            }
            break;
        case "player_vs_player_challenge":
            if (game.status === "waiting_acceptance" && senderID === game.challengedID && userAnswer === "أقبل التحدي") {
                const challengerRoll = Math.floor(Math.random() * 6) + 1;
                const challengedRoll = Math.floor(Math.random() * 6) + 1;
                let challengeMsg = `⚔️ تحدي النرد بين @${game.challengerID} و @${game.challengedID}:\n`;
                challengeMsg += `🎲 ${game.challengerID} رمى: ${challengerRoll}\n`;
                challengeMsg += `🎲 ${game.challengedID} رمى: ${challengedRoll}\n`;

                if (challengerRoll > challengedRoll) {
                    balance[game.challengerID] += game.bet;
                    balance[game.challengedID] -= game.bet;
                    challengeMsg += `🎉 الفائز هو @${game.challengerID}! ربح ${game.bet} SP.`;
                } else if (challengedRoll > challengerRoll) {
                    balance[game.challengedID] += game.bet;
                    balance[game.challengerID] -= game.bet;
                    challengeMsg += `🎉 الفائز هو @${game.challengedID}! ربح ${game.bet} SP.`;
                } else {
                    challengeMsg += `🤝 تعادل! لا يوجد فائز أو خاسر.`;
                }
                saveBalance(balance);
                api.sendMessage({
                    body: challengeMsg,
                    mentions: [{tag: `@${game.challengerID}`, id: game.challengerID}, {tag: `@${game.challengedID}`, id: game.challengedID}]
                }, threadID);
                delete activeGame[threadID];
            }
            return;
        case "bomb_game":
            if (game.timer) {
                activeGame[threadID].lastReplier = senderID;
            }
            return;
    }

    if (isCorrect && !game.winner) {
        const winnerTag = {
            tag: `الفائز (${senderID})`,
            id: senderID
        };
        api.sendMessage({
            body: `🏆 مبروك! الفائز هو: @${winnerTag.tag}\n🎯 الإجابة الصحيحة: ${game.answer}`,
            mentions: [winnerTag]
        }, threadID);
        if (!balance[senderID]) balance[senderID] = 0;
        balance[senderID] += 50;
        saveBalance(balance);
        activeGame[threadID].winner = senderID;
        setTimeout(() => {
            delete activeGame[threadID];
        }, 6000);
    }
};
