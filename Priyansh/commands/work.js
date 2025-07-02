const fs = require('fs');
const axios = require('axios'); // Still needed if you decide to add image functionality back, but not for this request.
const tempImageFilePath = __dirname + "/cache/tempIm1age.jpg"; // Keep for now in case of future use, but won't be used in this version.

module.exports.config = {
    name: "الاسرع",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "احمد عجينة",
    description: "لعبة الاسرع",
    usages: ["لعبة"],
    commandCategory: "العاب",
    cooldowns: 0
};

module.exports.handleReply = async function ({ api, event, handleReply, Currencies, Users }) {
    const userAnswer = event.body.trim().toLowerCase();
    const correctAnswer = handleReply.correctAnswer.toLowerCase();
    const userName = global.data.userName.get(event.senderID) || await Users.getNameUser(event.senderID);

    if (userAnswer === correctAnswer) {
        Currencies.increaseMoney(event.senderID, 50); // يمكن تعديل المكافأة
        api.sendMessage(`🎉 تهانينا ${userName}! أنت الأسرع! 🎉\nلقد حصلت على 50 دولار كمكافأة.`, event.threadID);

        // إزالة رسالة اللعبة الأصلية لمنع الإجابات المتعددة بعد الفوز
        api.unsendMessage(handleReply.messageID);
        // حذف الصورة المؤقتة (no longer relevant but kept for robustness if file exists)
        if (fs.existsSync(tempImageFilePath)) {
            fs.unlinkSync(tempImageFilePath);
        }
    } else {
        api.sendMessage(`❌ خطأ يا ${userName}. حاول مرة أخرى!`, event.threadID);
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    // قائمة أسئلة جديدة ومتنوعة - فقط الإيموجي
    const emojis = [
        "❤️", "👍", "😂", "🤔", "😎", "🌸", "⭐", "🍕", "🚗", "🏡",
        "📚", "💡", "🍦", "🌙", "☀️", "🎶", "🔥", "🌊", "🌈", "🚀",
        "⏳", "🎈", "🎁", "👑", "💯", "✅", "❌", "⚠️", "💖", "💫",
        "🍀", "💎", "🏆", "🎯", "🧩", "🔮", "🔑", "🔗", "✉️", "🔔",
        "⏰", "🗓️", "📈", "📉", "📍", "🗺️", "🧭", "🛡️", "⚔️", "💰",
        "🐸", "🦊", "🍌", "🥺", "👀", "🏖️", "🪆", "😊", "😇", "😉",
        "😁", "😀", "😃", "😄", "😅", "😆", "🥹", "🥲", "☺️", "🙂",
        "🙃", "🫠", "😛", "😝", "😜", "🤪", "🤫", "😶", "🫡", "🤔",
        "😮", "😲", "😯", "😳", "🤯", "🥶", "😠", "😡", "🤬", "😤",
        "😟", "😔", "😥", "😩", "😫", "😮‍💨", "😵", "😴", "😪", "🤤",
        "😓", "🤒", "😷", "🤕", "🤢", "🤮", "🤧", "😇", "🥳", "🥺",
        "🥹", "🤔", "🤫", "🤥", "🫠", "🫥", "🫤", "🫣", "🫡", "🤝",
        "🙏", "💪", "🫶", "👍", "👎", "👏", "🙌", "👐", "🤲", "🤜",
        "🤛", "👊", "✊", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏",
        "👋", "🤚", "🖐️", "✋", "🖖", "☝️", "👆", "👇", "👉", "👈"
    ];

    const correctAnswer = emojis[Math.floor(Math.random() * emojis.length)];

    try {
        // تأخير لمدة 5 ثواني
        setTimeout(async () => {
            api.sendMessage(correctAnswer, event.threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        correctAnswer: correctAnswer
                    });
                } else {
                    console.error("خطأ في إرسال رسالة اللعبة:", error);
                    api.sendMessage("عذرًا، حدث خطأ أثناء إطلاق اللعبة. يرجى المحاولة مرة أخرى.", event.threadID);
                }
            });
        }, 5000); // 5000 ميلي ثانية = 5 ثوانٍ

    } catch (e) {
        console.error("خطأ أثناء تحضير اللعبة:", e);
        api.sendMessage("عذرًا، حدث خطأ أثناء تحضير اللعبة. يرجى المحاولة مرة أخرى.", event.threadID);
    }
};
