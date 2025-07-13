const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
    name: "صيانة_العبة",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "سواد البغدادي",
    description: "ألعاب متنوعة + رصيد ورهانات",
    commandCategory: "🎮 الألعاب",
    usages: "games [اسم اللعبة]",
    cooldowns: 3,
};

const dataFile = __dirname + "/games_balance.json";
const bannedUsersFile = __dirname + "/games_banned_users.json"; // ملف المستخدمين المحظورين
const DEVELOPER_ID = "100015903097543"; // أيدي المطور

const emojiList = ["😂", "😍", "🔥", "💀", "🥶", "🤡", "😎", "😡"];
const animeNames = ["لوفي", "ناروتو", "غوكو", "إيتاشي", "زورو"];
const difficultWords = ["إستعصاء", "استراتيجية", "متناقضات", "استكشاف"];
const countriesStartingWithS = ["سوريا", "السودان", "الصومال", "سلطنة عمان", "السعودية"];
const lockCodes = {}; // لتخزين رموز القفل لكل محادثة

let activeGame = {}; // لتتبع الألعاب النشطة في كل محادثة

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

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const balance = getBalance();
    const bannedUsers = getBannedUsers();

    // التحقق إذا كان المستخدم محظوراً
    if (bannedUsers.includes(senderID)) {
        console.log(`User ${senderID} is banned and tried to use the command.`);
        return; // لا يستجيب الكود إذا كان المستخدم محظوراً
    }

    if (!balance[senderID]) balance[senderID] = 500; // رصيد أولي

    const command = args[0]?.toLowerCase();

    // إذا كانت هناك لعبة نشطة وتنتظر ردًا، لا تبدأ لعبة جديدة
    if (activeGame[threadID] && command !== "الغاء_اللعبة") {
        return api.sendMessage("🚫 هناك لعبة نشطة بالفعل في هذه المحادثة. يرجى الانتظار حتى تنتهي أو استخدام 'games الغاء_اللعبة'.", threadID, messageID);
    }
    
    // أمر إلغاء اللعبة
    if (command === "الغاء_اللعبة") {
        if (activeGame[threadID]) {
            delete activeGame[threadID];
            delete lockCodes[threadID]; // مسح رمز القفل إذا كان هناك
            return api.sendMessage("✅ تم إلغاء اللعبة النشطة في هذه المحادثة.", threadID, messageID);
        } else {
            return api.sendMessage("❌ لا توجد لعبة نشطة لإلغائها في هذه المحادثة.", threadID, messageID);
        }
    }

    // ========== 🚫 أمر حظر / إلغاء حظر ==========
    if (command === "حظر") {
        if (senderID !== DEVELOPER_ID) {
            return api.sendMessage("❌ هذا الأمر خاص بالمطور فقط.", threadID, messageID);
        }

        const mentionID = Object.keys(mentions)[0];
        if (!mentionID) {
            return api.sendMessage(`❌ استخدم: games حظر @[الشخص] لحظر مستخدم، أو games حظر إلغاء @[الشخص] لإلغاء الحظر.`, threadID, messageID);
        }

        if (args[1]?.toLowerCase() === "إلغاء") {
            const index = bannedUsers.indexOf(mentionID);
            if (index > -1) {
                bannedUsers.splice(index, 1);
                saveBannedUsers(bannedUsers);
                return api.sendMessage(`✅ تم إلغاء حظر المستخدم @${mentionID} بنجاح.`, threadID, messageID);
            } else {
                return api.sendMessage(`❌ المستخدم @${mentionID} ليس محظوراً أصلاً.`, threadID, messageID);
            }
        } else {
            if (!bannedUsers.includes(mentionID)) {
                bannedUsers.push(mentionID);
                saveBannedUsers(bannedUsers);
                return api.sendMessage(`✅ تم حظر المستخدم @${mentionID} من استخدام الكود.`, threadID, messageID);
            } else {
                return api.sendMessage(`❌ المستخدم @${mentionID} محظور بالفعل.`, threadID, messageID);
            }
        }
    }

    // ========== 💰 رصيدي ==========
    if (command === "رصيدي") {
        setTimeout(() => {
            api.sendMessage(`💸 رصيدك الحالي: ${balance[senderID]} SP`, threadID, messageID);
        }, 5000);
        return;
    }

    // ========== ➕ زيادة (محدث) ==========
    if (command === "زيادة") {
        if (senderID !== DEVELOPER_ID) {
            return api.sendMessage("❌ هذا الأمر خاص بالمطور فقط.", threadID, messageID);
        }

        if (!messageReply) {
            return api.sendMessage("💡 لزيادة الرصيد، يجب عليك الرد على رسالة الشخص المستهدف مع كتابة 'زيادة [المبلغ]'.", threadID, messageID);
        }

        const targetID = messageReply.senderID;
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            setTimeout(() => {
                api.sendMessage(`❌ الرجاء تحديد مبلغ صحيح للزيادة. مثال: الرد على رسالة الشخص وكتابة 'زيادة 100'.`, threadID, messageID);
            }, 5000);
            return;
        }

        if (!balance[targetID]) balance[targetID] = 0;
        balance[targetID] += amount;
        saveBalance(balance);

        setTimeout(() => {
            api.sendMessage(`✅ تم إضافة ${amount} SP إلى @${targetID} (رصيده الآن: ${balance[targetID]} SP)`, threadID, messageID);
        }, 5000);
        return;
    }

    // ========== 🎰 رهان ==========
    if (command === "رهان") {
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            setTimeout(() => {
                api.sendMessage("❌ ضع مبلغ صحيح مثل: games رهان 100", threadID, messageID);
            }, 5000);
            return;
        }

        if (balance[senderID] < betAmount) {
            setTimeout(() => {
                api.sendMessage("🚫 لا تملك رصيد كافي للمراهنة.", threadID, messageID);
            }, 5000);
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
        setTimeout(() => {
            api.sendMessage(msg, threadID, messageID);
        }, 5000);
        return;
    }

    // ========== 🎮 الألعاب الجديدة والمحدثة ==========

    // 1. رهان المبلغ (مدمجة مع رهان حالية)
    if (command === "bet") {
        // تم دمجها مع أمر "رهان"
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            setTimeout(() => {
                api.sendMessage("❌ استخدم: games bet [المبلغ]", threadID, messageID);
            }, 5000);
            return;
        }
        if (balance[senderID] < betAmount) {
            setTimeout(() => {
                api.sendMessage("🚫 لا تملك رصيد كافي للمراهنة.", threadID, messageID);
            }, 5000);
            return;
        }

        const win = Math.random() < 0.5;
        let msg = "";
        if (win) {
            balance[senderID] += betAmount;
            msg = `🎉 مبروك! ربحت ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
        } else {
            balance[senderID] -= betAmount;
            msg = `💔 للأسف! خسرت ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
        }
        saveBalance(balance);
        setTimeout(() => {
            api.sendMessage(msg, threadID, messageID);
        }, 5000);
        return;
    }

    // 2. أسرع شخص يرسل الإيموجي (محدثة)
    if (command === "ايموجي") {
        const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        setTimeout(() => {
            api.sendMessage(`🚨 تحدي سريع!\nأول من يرسل: ${randomEmoji} 🏁`, threadID, (err, info) => {
                activeGame[threadID] = { type: "emoji", answer: randomEmoji, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 3. فكك اسم أنمي (محدثة)
    if (command === "فكك") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const shuffledWord = word.split("").sort(() => 0.5 - Math.random()).join(" ");
        setTimeout(() => {
            api.sendMessage(`🧩 فكك الكلمة المشفرة إلى اسم أنمي: ${shuffledWord}`, threadID, (err, info) => {
                activeGame[threadID] = { type: "fakkak_anime", answer: word, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 4. أول من يكتب الكلمة (محدثة)
    if (command === "اكتب") {
        const randomWord = difficultWords[Math.floor(Math.random() * difficultWords.length)];
        setTimeout(() => {
            api.sendMessage(`✍️ أسرع شخص يكتب الكلمة التالية بشكل صحيح: "${randomWord}"`, threadID, (err, info) => {
                activeGame[threadID] = { type: "write_word", answer: randomWord, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 5. رتب الكلمة (محدثة)
    if (command === "رتب") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const shuffledLetters = word.split("").sort(() => 0.5 - Math.random()).join(" ");
        setTimeout(() => {
            api.sendMessage(`🔄 رتب الحروف لتكون كلمة صحيحة: "${shuffledLetters}"`, threadID, (err, info) => {
                activeGame[threadID] = { type: "arrange_word", answer: word, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 6. لعبة النرد
    if (command === "نرد") {
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            setTimeout(() => {
                api.sendMessage("❌ استخدم: games نرد [المبلغ] للمراهنة.", threadID, messageID);
            }, 5000);
            return;
        }
        if (balance[senderID] < betAmount) {
            setTimeout(() => {
                api.sendMessage("🚫 لا تملك رصيد كافي للمراهنة على النرد.", threadID, messageID);
            }, 5000);
            return;
        }

        const diceRoll = Math.floor(Math.random() * 6) + 1; // 1-6
        let msg = `🎲 رميت النرد وجاء الرقم: ${diceRoll}\n`;
        if (diceRoll >= 4) {
            balance[senderID] += betAmount;
            msg += `🎉 مبروك! فزت بـ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
        } else {
            balance[senderID] -= betAmount;
            msg += `💔 للأسف! خسرت ${betAmount} SP. رصيدك الآن: ${balance[senderID]} SP`;
        }
        saveBalance(balance);
        setTimeout(() => {
            api.sendMessage(msg, threadID, messageID);
        }, 5000);
        return;
    }

    // 7. كم عدد الحروف؟
    if (command === "عدد_حروف") {
        const randomWord = difficultWords[Math.floor(Math.random() * difficultWords.length)];
        setTimeout(() => {
            api.sendMessage(`🔤 ما هو عدد حروف الكلمة التالية: "${randomWord}"؟`, threadID, (err, info) => {
                activeGame[threadID] = { type: "count_letters", answer: randomWord.length.toString(), messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 8. ضاعف فلوسك (مدمجة مع أمر bet بتعديل النسبة)
    // يمكن اعتبار أمر "bet" الحالي هو "ضاعف فلوسك" بنسبة 50% فوز.

    // 9. لعبة الهدف
    if (command === "هدف") {
        const targetEmoji = "🎯";
        setTimeout(() => {
            api.sendMessage(`🎯 لعبة الهدف! أول من يرسل الإيموجي: ${targetEmoji} يكسب!`, threadID, (err, info) => {
                activeGame[threadID] = { type: "target_emoji", answer: targetEmoji, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 10. أسرع تخمين رقم
    if (command === "تخمين_رقم") {
        const randomNumber = Math.floor(Math.random() * 10) + 1; // رقم بين 1 و 10
        setTimeout(() => {
            api.sendMessage(`🥇 أخفيت رقمًا بين 1 و 10. من يخمّنه أولاً يكسب!`, threadID, (err, info) => {
                activeGame[threadID] = { type: "guess_number", answer: randomNumber.toString(), messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 11. معكوس الكلمة
    if (command === "معكوس") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const reversedWord = word.split("").reverse().join("");
        setTimeout(() => {
            api.sendMessage(`🧠 ما هو معكوس الكلمة: "${reversedWord}"؟`, threadID, (err, info) => {
                activeGame[threadID] = { type: "reverse_word", answer: word, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 12. كلمة بدون نقاط (تحتاج إلى قائمة أكبر من الكلمات)
    if (command === "بدون_نقاط") {
        const exampleWords = [
            { word: "حسن", noDots: true },
            { word: "خالد", noDots: false },
            { word: "سعاد", noDots: true },
            { word: "نبيل", noDots: false }
        ];
        const randomExample = exampleWords[Math.floor(Math.random() * exampleWords.length)];
        const question = `🤓 أي من الكلمتين التاليتين لا تحتوي على نقاط؟ "${randomExample.word}" أو "${exampleWords.find(w => w !== randomExample).word}"؟`; // بسيط مؤقت
        // هذا يحتاج لمنطق أكثر تعقيداً لتوليد السؤال والتحقق من الإجابة الصحيحة
        setTimeout(() => {
            api.sendMessage(question, threadID, messageID);
            // activeGame[threadID] = { type: "no_dots_word", answer: randomExample.noDots ? randomExample.word : exampleWords.find(w => w.noDots).word, messageID: info.messageID, winner: null };
            // تم تعطيل تتبع اللعبة في handleEvent لهذه اللعبة لأنها معقدة وتتطلب قائمة أكبر من الكلمات ومقارنة دقيقة.
        }, 5000);
        return;
    }

    // 13. اسرع من يرد بـ...
    if (command === "دولة_بحرف") {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // حرف عشوائي (غير فعال مع العربية بشكل مباشر)
        const arabicLetters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
        const randomArabicLetter = arabicLetters[Math.floor(Math.random() * arabicLetters.length)];

        setTimeout(() => {
            api.sendMessage(`⏱️ أرسل اسم دولة تبدأ بحرف "${randomArabicLetter}" بأسرع وقت!`, threadID, (err, info) => {
                activeGame[threadID] = { type: "country_letter", answer: randomArabicLetter, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 14. اختبار ذكاء سريع
    if (command === "اختبار_ذكاء") {
        const question = "🧠 إذا كان 1=5 و 2=25، فكم 3؟";
        setTimeout(() => {
            api.sendMessage(question, threadID, (err, info) => {
                activeGame[threadID] = { type: "iq_test", answer: "3", messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 15. افتح القفل
    if (command === "افتح_القفل") {
        const code = Math.floor(Math.random() * 900) + 100; // رقم 3 أرقام
        lockCodes[threadID] = code.toString();
        setTimeout(() => {
            api.sendMessage(`🔐 رمز القفل من 3 أرقام. حاول تخمينه! مثال: 123`, threadID, (err, info) => {
                activeGame[threadID] = { type: "open_lock", answer: code.toString(), messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 16. تحدي لاعب ضد لاعب (يحتاج لميكانيكية طلب وموافقة)
    if (command === "تحدي") {
        const challengedUser = Object.keys(mentions)[0];
        if (!challengedUser || challengedUser === senderID) {
            return api.sendMessage("❌ لتحدي لاعب، قم بعمل تاغ للشخص الذي تريد تحديه: games تحدي @[الشخص] [المبلغ].", threadID, messageID);
        }
        const betAmount = parseInt(args[2]); // المبلغ بعد التاغ
        if (isNaN(betAmount) || betAmount <= 0) {
            return api.sendMessage("❌ يجب تحديد مبلغ الرهان في التحدي. مثال: games تحدي @[الشخص] 100.", threadID, messageID);
        }
        if (balance[senderID] < betAmount || balance[challengedUser] < betAmount) {
             return api.sendMessage("🚫 لا تملك أنت أو خصمك رصيد كافي لهذا التحدي.", threadID, messageID);
        }

        // هنا تحتاج لمنطق للتعامل مع الموافقة على التحدي من الشخص الآخر
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
                messageID: messageID // لتتبع الرسالة الأصلية للتحدي
            };
        }, 5000);
        return;
    }


    // 17. فكك جملة
    if (command === "فكك_جملة") {
        const sentence = "ناروتو قوي"; // يمكنك إضافة جمل أخرى في مصفوفة
        const answer = sentence.split("").join(" ");
        setTimeout(() => {
            api.sendMessage(`🧩 فكك الجملة التالية بسرعة: "${sentence}"`, threadID, (err, info) => {
                activeGame[threadID] = { type: "fakkak_sentence", answer: answer, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 18. أين تقع الدولة؟
    if (command === "أين_تقع") {
        const countriesData = [
            { country: "فنلندا", continent: "أوروبا" },
            { country: "اليابان", continent: "آسيا" },
            { country: "مصر", continent: "أفريقيا" },
            { country: "البرازيل", continent: "أمريكا الجنوبية" }
        ];
        const randomCountry = countriesData[Math.floor(Math.random() * countriesData.length)];
        setTimeout(() => {
            api.sendMessage(`🗺️ في أي قارة تقع دولة "${randomCountry.country}"؟`, threadID, (err, info) => {
                activeGame[threadID] = { type: "where_is_country", answer: randomCountry.continent, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 19. من الشخصية؟
    if (command === "شخصية") {
        const characters = [
            { name: "ناروتو", hint: "نينجا، يرتدي برتقالي، يحب الرامن" },
            { name: "غوكو", hint: "ساياجين، قوي جداً، يأكل كثيراً" },
            { name: "لوفي", hint: "قرصان، جسده مطاطي، يبحث عن الون بيس" }
        ];
        const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
        setTimeout(() => {
            api.sendMessage(`🕵️‍♂️ من هذه الشخصية؟ تلميح: "${randomCharacter.hint}"`, threadID, (err, info) => {
                activeGame[threadID] = { type: "guess_character", answer: randomCharacter.name, messageID: info.messageID, winner: null };
            });
        }, 5000);
        return;
    }

    // 20. لعبة القنبلة (تحتاج لمنطق `handleEvent` معقد للعد التنازلي)
    if (command === "قنبلة") {
        const countdownTime = 10; // 10 ثواني
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
                }, 1000); // تحديث كل ثانية
            });
        }, 5000); // 5 ثواني قبل بدء اللعبة
        return;
    }


    // رسالة الاستخدام الافتراضية
    setTimeout(() => {
        api.sendMessage(`❓ الأوامر المتاحة: 
        💰 الأرصدة: رصيدي, رهان [مبلغ], bet [مبلغ]
        🎮 الألعاب: ايموجي, فكك, اكتب, رتب, نرد, عدد_حروف, هدف, تخمين_رقم, معكوس, بدون_نقاط, دولة_بحرف, اختبار_ذكاء, افتح_القفل, تحدي @[شخص] [مبلغ], فكك_جملة, أين_تقع, شخصية, قنبلة
        🛠️ للمطور فقط: زيادة (بالرد), حظر @[شخص], حظر إلغاء @[شخص]
        ❌ لإلغاء لعبة نشطة: الغاء_اللعبة
        `, threadID, messageID);
    }, 5000);
};

// 📥 handleEvent للألعاب السريعة
module.exports.handleEvent = function({ api, event }) {
    const { threadID, body, senderID, messageID } = event;
    const bannedUsers = getBannedUsers();
    const balance = getBalance(); // قم بتحميل الرصيد هنا لاستخدامه في handleEvent

    // التحقق إذا كان المستخدم محظوراً
    if (bannedUsers.includes(senderID)) {
        return;
    }

    if (!activeGame[threadID]) return;
    const game = activeGame[threadID];
    const userAnswer = body?.trim().toLowerCase(); // تحويل الإجابة إلى حروف صغيرة للمقارنة

    // منع نفس الفائز من الفوز مرتين في نفس اللعبة
    if (game.winner && game.winner === senderID) return;

    const winnerTag = {
        tag: `الفائز (${senderID})`, // يمكنك الحصول على اسم المستخدم من api إذا كان متاحًا
        id: senderID
    };

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
            if (userAnswer === game.answer) { // الإجابة هي رقم، لذا لا نحتاج لـ .toLowerCase()
                isCorrect = true;
            }
            break;
        case "country_letter":
            // هذا يتطلب قائمة بالدول تبدأ بالحرف المعطى للتحقق الفعال
            // حالياً، نعتبر أي رد يبدأ بالحرف صحيحًا (قد لا يكون دقيقًا 100%)
            if (userAnswer && userAnswer.startsWith(game.answer.toLowerCase())) {
                isCorrect = true;
            }
            break;
        case "open_lock":
            if (userAnswer === game.answer) {
                isCorrect = true;
            } else {
                // رسالة تلميح لـ "افتح القفل"
                const correctDigits = [...game.answer].filter((digit, index) => digit === userAnswer[index]).length;
                api.sendMessage(`❌ خطأ! ${correctDigits} رقم صحيح في مكانه الصحيح.`, threadID, messageID);
            }
            break;
        case "player_vs_player_challenge":
            if (game.status === "waiting_acceptance" && senderID === game.challengedID && userAnswer === "أقبل التحدي") {
                // تبدأ لعبة النرد بين اللاعبين
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
            return; // لا تكمل لمعالجة الفوز العادي
        case "bomb_game":
            // أي رد من أي مستخدم يعيد ضبط مؤقت الخاسر
            if (game.timer) {
                activeGame[threadID].lastReplier = senderID;
            }
            return; // لا تكمل لمعالجة الفوز العادي
    }

    if (isCorrect && !game.winner) { // التحقق من عدم وجود فائز مسبق
        api.sendMessage({
            body: `🏆 مبروك! الفائز هو: @${winnerTag.tag}\n🎯 الإجابة الصحيحة: ${game.answer}`,
            mentions: [winnerTag]
        }, threadID);
        // إضافة جائزة للفائز
        if (!balance[senderID]) balance[senderID] = 0;
        balance[senderID] += 50; // جائزة 50 SP للفائز
        saveBalance(balance);

        activeGame[threadID].winner = senderID; // تحديد الفائز لمنع الفوز المتعدد
        // يمكن حذف activeGame[threadID] هنا أو بعد فترة زمنية للسماح للناس برؤية الفائز
        // For now, let's keep it to prevent multiple winners for the same game instance
        setTimeout(() => {
            delete activeGame[threadID];
        }, 3000); // حذف اللعبة بعد 3 ثواني من الفوز
    }
};
