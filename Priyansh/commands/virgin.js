const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
    name: "games",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "سواد البغدادي",
    description: "ألعاب متنوعة + رصيد ورهانات",
    commandCategory: "🎮 الألعاب",
    usages: "games [اسم اللعبة]",
    cooldowns: 3,
};

const dataFile = __dirname + "/games_balance.json";
const emojiList = ["😂", "😍", "🔥", "💀", "🥶", "🤡", "😎", "😡"];
const animeNames = ["لوفي", "ناروتو", "غوكو", "إيتاشي", "زورو"];
let activeGame = {};

// 💰 تحميل أو إنشاء ملف الرصيد
function getBalance() {
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(dataFile));
}
function saveBalance(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, mentions } = event;
    const balance = getBalance();
    if (!balance[senderID]) balance[senderID] = 500; // رصيد أولي

    const command = args[0]?.toLowerCase();

    // ========== 💰 رصيدي ==========
    if (command === "رصيدي") {
        setTimeout(() => {
            api.sendMessage(`💸 رصيدك الحالي: ${balance[senderID]} SP`, threadID, messageID);
        }, 5000); // 5-second delay
        return;
    }

    // ========== ➕ زيادة ==========
    if (command === "زيادة") {
        const mentionID = Object.keys(mentions)[0];
        const amount = parseInt(args[2]);

        if (!mentionID || isNaN(amount) || amount <= 0) {
            setTimeout(() => {
                api.sendMessage(`❌ استخدم: games زيادة @[الشخص] [المبلغ]`, threadID, messageID);
            }, 5000); // 5-second delay
            return;
        }

        if (!balance[mentionID]) balance[mentionID] = 0;
        balance[mentionID] += amount;
        saveBalance(balance);
        setTimeout(() => {
            api.sendMessage(`✅ تم إضافة ${amount} SP إلى @${mentionID}`, threadID, messageID);
        }, 5000); // 5-second delay
        return;
    }

    // ========== 🎰 رهان ==========
    if (command === "رهان") {
        const betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            setTimeout(() => {
                api.sendMessage("❌ ضع مبلغ صحيح مثل: games رهان 100", threadID, messageID);
            }, 5000); // 5-second delay
            return;
        }

        if (balance[senderID] < betAmount) {
            setTimeout(() => {
                api.sendMessage("🚫 لا تملك رصيد كافي للمراهنة.", threadID, messageID);
            }, 5000); // 5-second delay
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
        }, 5000); // 5-second delay
        return;
    }

    // ========== 🎮 الألعاب القديمة ==========
    if (command === "ايموجي") {
        const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        setTimeout(() => {
            api.sendMessage(`🚨 تحدي سريع!\nأول من يرسل: ${randomEmoji} 🏁`, threadID, (err, info) => {
                activeGame[threadID] = { type: "emoji", answer: randomEmoji, messageID: info.messageID };
            });
        }, 5000); // 5-second delay
        return;
    }

    if (command === "فكك") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const answer = word.split("").join(" ");
        setTimeout(() => {
            api.sendMessage(`🧩 فكك الكلمة بسرعة: ${word}`, threadID, (err, info) => {
                activeGame[threadID] = { type: "fakkak", answer, messageID: info.messageID };
            });
        }, 5000); // 5-second delay
        return;
    }

    if (command === "جمع") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const letters = word.split("").join(" ");
        setTimeout(() => {
            api.sendMessage(`🧠 اجمع الحروف إلى كلمة: ${letters}`, threadID, (err, info) => {
                activeGame[threadID] = { type: "gama3", answer: word, messageID: info.messageID };
            });
        }, 5000); // 5-second delay
        return;
    }

    if (command === "اسرع") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        setTimeout(() => {
            api.sendMessage(`⚡ أسرع شخص يكتب: ${word}`, threadID, (err, info) => {
                activeGame[threadID] = { type: "repeat", answer: word, messageID: info.messageID };
            });
        }, 5000); // 5-second delay
        return;
    }

    if (command === "موتي") {
        const fakeDate = `${Math.floor(Math.random() * 30 + 1)}/${
            Math.floor(Math.random() * 12 + 1)
        }/19${Math.floor(Math.random() * 90 + 10)}`;
        const fakeDeath = `${Math.floor(Math.random() * 30 + 1)}/${
            Math.floor(Math.random() * 12 + 1)
        }/20${Math.floor(Math.random() * 25 + 1)}`;
        const reasons = ["أُكل من تنين 🐉", "انفجر من الضحك 😂", "انقرض 🦖", "بلعه الحوت 🐋"];
        const fakeMoney = `${Math.floor(Math.random() * 500)} مليون دولار 💸`;

        const deathMessage =
`☠️ شهادة وفاة افتراضية ☠️

📆 تاريخ الميلاد: ${fakeDate}
💀 تاريخ الوفاة: ${fakeDeath}
📄 سبب الوفاة: ${reasons[Math.floor(Math.random() * reasons.length)]}
💰 الثروة عند الوفاة: ${fakeMoney}

😂 الموت علينا حق، بس المزاح أيضاً حق!`;

        setTimeout(() => {
            api.sendMessage(deathMessage, threadID, messageID);
        }, 5000); // 5-second delay
        return;
    }

    setTimeout(() => {
        api.sendMessage(`❓ استخدم: games [ايموجي | فكك | جمع | اسرع | موتي | رصيدي | رهان | زيادة]`, threadID, messageID);
    }, 5000); // 5-second delay
};

// 📥 handleEvent للألعاب السريعة
module.exports.handleEvent = function({ api, event }) {
    const { threadID, body, senderID, messageID } = event;
    if (!activeGame[threadID]) return;
    const game = activeGame[threadID];
    const userAnswer = body?.trim();

    if (!userAnswer) return;

    const winnerTag = {
        tag: "الفائز",
        id: senderID
    };

    if (userAnswer === game.answer) {
        api.sendMessage({
            body: `🏆 مبروك! الفائز هو: @${winnerTag.tag}\n🎯 الإجابة الصحيحة: ${game.answer}`,
            mentions: [winnerTag]
        }, threadID);
        delete activeGame[threadID];
    }
};
