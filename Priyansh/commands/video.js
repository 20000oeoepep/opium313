const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
    name: "broadcastLogo",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "سواد البغدادي",
    description: "إرسال شعار البوت إلى جميع المجموعات",
    commandCategory: "admin",
    usages: "",
    cooldowns: 60,
};

module.exports.run = async function({ api, args }) {
    const allThreads = await api.getThreadList(100, null, ["INBOX"]);
    const commandCount = fs.readdirSync(__dirname + "/../").length;

    const timeNow = moment().tz("Asia/Baghdad").format("YYYY-MM-DD HH:mm:ss");

    let successCount = 0;
    let failCount = 0;

    for (const thread of allThreads) {
        if (thread.isGroup && thread.threadID) {
            try {
                const groupName = thread.name || "مجموعة بدون اسم";
                const memberCount = thread.participantIDs.length;
                const messageCount = thread.messageCount || "غير معروف";

                const message = 
`🦾 شِعـار بوت رِيـو 🦾

📛 اسم البوت: رِيـو
🧑‍💻 المطور: سـواد البغـدادي
🕰️ التاريخ والوقت: ${timeNow}

📢 المجموعة: ${groupName}
👥 عدد الأعضاء: ${memberCount}
💬 عدد الرسائل: ${messageCount}
📦 عدد الأوامر: ${commandCount}

شكراً لاستخدامكم بوت ريو 😎`;

                await api.sendMessage(message, thread.threadID);
                successCount++;
            } catch (e) {
                console.error(`فشل في الإرسال إلى ${thread.threadID}:`, e.message);
                failCount++;
            }
        }
    }

    api.sendMessage(`✅ تم الإرسال إلى ${successCount} مجموعة.\n❌ فشل في ${failCount} مجموعة.`, args[0]);
};
