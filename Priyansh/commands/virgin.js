const moment = require("moment-timezone");

module.exports.config = {
    name: "games",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "سواد البغدادي",
    description: "5 ألعاب متنوعة وتفاعلية",
    commandCategory: "🎮 الألعاب",
    usages: "ريو العاب [اسم اللعبة]",
    cooldowns: 5,
};

const emojiList = ["😂", "😍", "🔥", "💀", "🥶", "🤡", "😎", "😡"];
const animeNames = ["لوفي", "ناروتو", "غوكو", "إيتاشي", "زورو"];

let activeGame = {};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const gameType = args[0]?.toLowerCase();

    // ========== 1. لعبة الإيموجي ==========
    if (gameType === "ايموجي") {
        const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        api.sendMessage(`🎮 أسرع شخص يرسل هذا الإيموجي: ${randomEmoji}`, threadID, (err, info) => {
            activeGame[threadID] = {
                type: "emoji",
                answer: randomEmoji,
                messageID: info.messageID
            };
        });
        return;
    }

    // ========== 2. لعبة فكك ==========
    if (gameType === "فكك") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const answer = word.split("").join(" ");
        api.sendMessage(`🎮 فكك الكلمة التالية بسرعة: ${word}`, threadID, (err, info) => {
            activeGame[threadID] = {
                type: "fakkak",
                answer: answer,
                messageID: info.messageID
            };
        });
        return;
    }

    // ========== 3. لعبة جمع ==========
    if (gameType === "جمع") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        const letters = word.split("").join(" ");
        api.sendMessage(`🎮 اجمع الحروف التالية إلى كلمة صحيحة: ${letters}`, threadID, (err, info) => {
            activeGame[threadID] = {
                type: "gama3",
                answer: word,
                messageID: info.messageID
            };
        });
        return;
    }

    // ========== 4. لعبة الاسرع ==========
    if (gameType === "اسرع") {
        const word = animeNames[Math.floor(Math.random() * animeNames.length)];
        api.sendMessage(`🎮 اكتب هذه الكلمة بسرعة: ${word}`, threadID, (err, info) => {
            activeGame[threadID] = {
                type: "repeat",
                answer: word,
                messageID: info.messageID
            };
        });
        return;
    }

    // ========== 5. لعبة الموت ==========
    if (gameType === "موتي") {
        const fakeDate = `${Math.floor(Math.random() * 30 + 1)}/${
            Math.floor(Math.random() * 12 + 1)
        }/19${Math.floor(Math.random() * 90 + 10)}`;
        const fakeDeath = `${Math.floor(Math.random() * 30 + 1)}/${
            Math.floor(Math.random() * 12 + 1)
        }/20${Math.floor(Math.random() * 25 + 1)}`;
        const reasons = ["أُكل من تنين 🐉", "سقط من القمر 🌕", "انفجر من الضحك 😂", "انقرض 🦖", "بلعه الحوت 🐋"];
        const fakeMoney = `${Math.floor(Math.random() * 1000)} مليون دولار 💸`;

        const deathMessage = 
`☠️ شهادة وفاة ☠️

📆 تاريخ الميلاد: ${fakeDate}
💀 تاريخ الوفاة: ${fakeDeath}
📄 سبب الوفاة: ${reasons[Math.floor(Math.random() * reasons.length)]}
💰 الثروة: ${fakeMoney}

البقاء لله 😂`;

        return api.sendMessage(deathMessage, threadID, messageID);
    }

    // ⚠️ إذا لم يكتب اسم لعبة معروف
    api.sendMessage(`🧠 استخدم هكذا: ريو العاب [ايموجي | فكك | جمع | اسرع | موتي]`, threadID, messageID);
};

// ======== متابعة الألعاب الجارية ========
module.exports.handleEvent = function({ api, event }) {
    const { threadID, body, senderID, messageID } = event;
    if (!activeGame[threadID]) return;

    const game = activeGame[threadID];
    const userAnswer = body?.trim();

    if (!userAnswer) return;

    switch (game.type) {
        case "emoji":
        case "repeat":
            if (userAnswer === game.answer) {
                api.sendMessage(`🎉 مبروك! الفائز هو: @${senderID}`, threadID, messageID);
                delete activeGame[threadID];
            }
            break;
        case "fakkak":
        case "gama3":
            if (userAnswer === game.answer) {
                api.sendMessage(`🏆 ممتاز! أحسنت يا بطل: @${senderID}`, threadID, messageID);
                delete activeGame[threadID];
            }
            break;
    }
};
