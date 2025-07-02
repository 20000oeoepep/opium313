const fs = require('fs');
const axios = require('axios');
const tempImageFilePath = __dirname + "/cache/tempIm1age.jpg"; // تأكد من وجود مجلد cache

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
        // حذف الصورة المؤقتة
        if (fs.existsSync(tempImageFilePath)) {
            fs.unlinkSync(tempImageFilePath);
        }
    } else {
        api.sendMessage(`❌ خطأ يا ${userName}. حاول مرة أخرى!`, event.threadID);
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    // قائمة أسئلة جديدة ومتنوعة
    const questions = [
        { "emoji": "❤️", "link": "https://i.imgur.com/kS9lK3C.png" },
        { "emoji": "👍", "link": "https://i.imgur.com/rN5hK0G.png" },
        { "emoji": "😂", "link": "https://i.imgur.com/bW3gH1y.png" },
        { "emoji": "🤔", "link": "https://i.imgur.com/yF4tY7p.png" },
        { "emoji": "😎", "link": "https://i.imgur.com/vH1Zc2x.png" },
        { "emoji": "🌸", "link": "https://i.imgur.com/P5aXj0u.png" },
        { "emoji": "⭐", "link": "https://i.imgur.com/nQ2dM0L.png" },
        { "emoji": "🍕", "link": "https://i.imgur.com/A6jK0Lg.png" },
        { "emoji": "🚗", "link": "https://i.imgur.com/Z4wQ7Xp.png" },
        { "emoji": "🏡", "link": "https://i.imgur.com/8F9xH7w.png" },
        { "emoji": "📚", "link": "https://i.imgur.com/F0yU7Lh.png" },
        { "emoji": "💡", "link": "https://i.imgur.com/J1mN5qR.png" },
        { "emoji": "🍦", "link": "https://i.imgur.com/X7tV4bS.png" },
        { "emoji": "🌙", "link": "https://i.imgur.com/G2eJ7fQ.png" },
        { "emoji": "☀️", "link": "https://i.imgur.com/C9qR5sL.png" },
        { "emoji": "🎶", "link": "https://i.imgur.com/Q3zV9eR.png" },
        { "emoji": "🔥", "link": "https://i.imgur.com/D4sT7gR.png" },
        { "emoji": "🌊", "link": "https://i.imgur.com/E1iK4pT.png" },
        { "emoji": "🌈", "link": "https://i.imgur.com/R6jV8hX.png" },
        { "emoji": "🚀", "link": "https://i.imgur.com/L5yD2qP.png" },
        { "emoji": "⏳", "link": "https://i.imgur.com/H7kM9cN.png" },
        { "emoji": "🎈", "link": "https://i.imgur.com/W2lF0xC.png" },
        { "emoji": "🎁", "link": "https://i.imgur.com/N8dJ4yK.png" },
        { "emoji": "👑", "link": "https://i.imgur.com/Z1hP5jV.png" },
        { "emoji": "💯", "link": "https://i.imgur.com/P9wE0dL.png" },
        { "emoji": "✅", "link": "https://i.imgur.com/T0bH7aF.png" },
        { "emoji": "❌", "link": "https://i.imgur.com/X4yK6eJ.png" },
        { "emoji": "⚠️", "link": "https://i.imgur.com/U5gJ8kQ.png" },
        { "emoji": "💖", "link": "https://i.imgur.com/Q7bM3cR.png" },
        { "emoji": "💫", "link": "https://i.imgur.com/V9rF1eL.png" },
        { "emoji": "🍀", "link": "https://i.imgur.com/C4zQ0pD.png" },
        { "emoji": "💎", "link": "https://i.imgur.com/Z8jW4yS.png" },
        { "emoji": "💡", "link": "https://i.imgur.com/Y3xR2fL.png" },
        { "emoji": "🏆", "link": "https://i.imgur.com/F0oB6wL.png" },
        { "emoji": "🎯", "link": "https://i.imgur.com/L7pS3aQ.png" },
        { "emoji": "🧩", "link": "https://i.imgur.com/M6hK9tP.png" },
        { "emoji": "🔮", "link": "https://i.imgur.com/N2sV8cX.png" },
        { "emoji": "🔑", "link": "https://i.imgur.com/Q9dL0fG.png" },
        { "emoji": "🔗", "link": "https://i.imgur.com/W3cJ2vM.png" },
        { "emoji": "✉️", "link": "https://i.imgur.com/B1xE1cC.png" },
        { "emoji": "🔔", "link": "https://i.imgur.com/Z5yT6eH.png" },
        { "emoji": "⏰", "link": "https://i.imgur.com/A8dU7eQ.png" },
        { "emoji": "🗓️", "link": "https://i.imgur.com/H4kP9jV.png" },
        { "emoji": "📈", "link": "https://i.imgur.com/X0cV1bN.png" },
        { "emoji": "📉", "link": "https://i.imgur.com/L1bN0cM.png" },
        { "emoji": "📍", "link": "https://i.imgur.com/G5sY8dU.png" },
        { "emoji": "🗺️", "link": "https://i.imgur.com/R9tW3cV.png" },
        { "emoji": "🧭", "link": "https://i.imgur.com/P0oV4eY.png" },
        { "emoji": "🛡️", "link": "https://i.imgur.com/K6jH8eU.png" },
        { "emoji": "⚔️", "link": "https://i.imgur.com/V2nC7sQ.png" },
        { "emoji": "💰", "link": "https://i.imgur.com/uQmrlvt.png" }, // من القائمة القديمة
        { "emoji": "🐸", "link": "https://i.imgur.com/rnsgJju.png" }, // من القائمة القديمة
        { "emoji": "🦊", "link": "https://i.imgur.com/uyElK2K.png" }, // من القائمة القديمة
        { "emoji": "🍌", "link": "https://i.imgur.com/71WozFU.jpg" }, // من القائمة القديمة
        { "emoji": "🥺", "link": "https://i.imgur.com/M69t6MP.jpg" }, // من القائمة القديمة
        { "emoji": "👀", "link": "https://i.imgur.com/sH3gFGd.jpg" }, // من القائمة القديمة
        { "emoji": "🏖️", "link": "https://i.imgur.com/CCb2cVz.png" }, // من القائمة القديمة
        { "emoji": "🪆", "link": "https://i.imgur.com/FUrUIYZ.jpg" }, // من القائمة القديمة
        // يمكنك إضافة المزيد من الملصقات هنا
    ];

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    const correctAnswer = randomQuestion.emoji;

    try {
        // رسالة ترحيبية بسيطة قبل التأخير
        await api.sendMessage("✨ مرحبًا بكم في لعبة الأسرع! ✨\nاستعدوا لتحدي الإيموجي القادم...", event.threadID);

        // تأخير لمدة 5 ثواني
        setTimeout(async () => {
            const imageResponse = await axios.get(randomQuestion.link, { responseType: "arraybuffer" });
            fs.writeFileSync(tempImageFilePath, Buffer.from(imageResponse.data, "binary"));

            const attachment = [fs.createReadStream(tempImageFilePath)];
            const message = `🔥 **الأســرع الآن!** 🔥\n\nأرسل هذا الإيموجي بأسرع وقت ممكن:\n\n👇👇👇\n\n[الإيموجي في الصورة]`;

            api.sendMessage({ body: message, attachment }, event.threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        correctAnswer: correctAnswer
                    });
                } else {
                    console.error("خطأ في إرسال رسالة اللعبة:", error);
                    api.sendMessage("عذرًا، حدث خطأ أثناء إطلاق اللعبة. يرجى المحاولة مرة أخرى.", event.threadID);
                    if (fs.existsSync(tempImageFilePath)) {
                        fs.unlinkSync(tempImageFilePath);
                    }
                }
            });
        }, 5000); // 5000 ميلي ثانية = 5 ثوانٍ

    } catch (e) {
        console.error("خطأ في تحميل الصورة أو إرسال الرسالة:", e);
        api.sendMessage("عذرًا، حدث خطأ أثناء تحضير اللعبة. يرجى المحاولة مرة أخرى.", event.threadID);
        if (fs.existsSync(tempImageFilePath)) {
            fs.unlinkSync(tempImageFilePath);
        }
    }
};
