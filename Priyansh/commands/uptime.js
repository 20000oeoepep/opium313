const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
    name: "ادمن", // اسم الكود الجديد
    version: "1.0.0",
    hasPermssion: 0,
    credits: "سواد البغدادي",
    description: "أدوات إدارية خاصة بالمطورين.",
    commandCategory: "🛠️ أدوات المطور",
    usages: "فحص / ستارك / لرس",
    cooldowns: 5,
};

// ==========================================
// 🛡️ الأيدي المسموح لها باستخدام هذا الكود
const AUTHORIZED_USERS = ["100015903097543"];
const DEVELOPER_ID = "100015903097543"; // لتسلسل الكود مع السابق
// ==========================================

// 📂 مسارات ملفات البيانات
const userStatsFile = __dirname + "/user_stats.json";
const groupStatsFile = __dirname + "/group_stats.json";
const dailyMessagesFile = __dirname + "/daily_messages.json";

// ⚙️ وظائف تحميل وحفظ البيانات
function loadData(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    // 🛡️ التحقق من صلاحيات المستخدم
    if (!AUTHORIZED_USERS.includes(senderID)) {
        setTimeout(() => {
            api.sendMessage("❌ عذرًا، أنت لست من المسؤولين المخولين باستخدام هذه الأداة.", threadID, messageID);
        }, 5000);
        return;
    }

    const command = args[0]?.toLowerCase();

    // 📊 فحص معلومات المستخدم
    if (command === "فحص") {
        setTimeout(async () => {
            let targetID;
            if (messageReply) {
                targetID = messageReply.senderID;
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
            } else {
                return api.sendMessage("💡 لاستخدام أمر 'فحص'، يرجى الرد على رسالة الشخص أو عمل تاغ له.", threadID, messageID);
            }

            const userStats = loadData(userStatsFile);
            const dailyMessages = loadData(dailyMessagesFile);
            const userInfo = await api.getUserInfo(targetID);
            const threadInfo = await api.getThreadInfo(threadID);

            const userName = userInfo[targetID]?.name || "المستخدم غير معروف";
            const userNickname = threadInfo.nicknames?.[targetID] || "لا يوجد كنية";

            const userDailyStats = dailyMessages[moment().tz("Asia/Baghdad").format("YYYY-MM-DD")]?.[threadID]?.[targetID] || 0;
            let messagesLast7Days = 0;
            for (let i = 0; i < 7; i++) {
                const date = moment().tz("Asia/Baghdad").subtract(i, 'days').format("YYYY-MM-DD");
                messagesLast7Days += dailyMessages[date]?.[threadID]?.[targetID] || 0;
            }

            const stats = userStats[targetID] || { totalMessages: 0, departures: 0, additions: 0 };

            const response = `
╔═════ 「 معلومات المستخدم 」 ═════╗
║ 👤 الاسم: ${userName}
║ 🆔 الأيدي: ${targetID}
║ 💬 إجمالي الرسائل: ${stats.totalMessages}
║ 📅 رسائل في آخر 7 أيام: ${messagesLast7Days}
║ 🚶 المغادرات من المجموعة: ${stats.departures} مرة
║ ➕ الإضافات إلى المجموعة: ${stats.additions} مرة
║ ✏️ الكنية الحالية في المجموعة: ${userNickname}
╚═════ 「 🌟 」 ═════╝
            `;
            api.sendMessage(response, threadID, messageID);
        }, 5000);
        return;
    }

    // 🌟 قائمة الكنيات (ستارك)
    if (command === "ستارك") {
        setTimeout(async () => {
            const threadInfo = await api.getThreadInfo(threadID);
            const nicknames = threadInfo.nicknames || {};

            let nicknameList = "╔═════ 「 قائمة الكنيات 」 ═════╗\n";
            let count = 0;
            for (const userID in nicknames) {
                if (nicknames[userID]) {
                    const userInfo = await api.getUserInfo(userID);
                    const userName = userInfo[userID]?.name || "مستخدم غير معروف";
                    nicknameList += `║ 🔹 ${userName}: ${nicknames[userID]}\n`;
                    count++;
                }
            }
            if (count === 0) {
                nicknameList += "║ ❌ لا توجد كنيات محددة في هذه المجموعة.\n";
            }
            nicknameList += "╚═════ 「 📜 」 ═════╝";
            api.sendMessage(nicknameList, threadID, messageID);
        }, 5000);
        return;
    }

    // 📊 إحصائيات المجموعة (لرس)
    if (command === "لرس") {
        setTimeout(async () => {
            const groupStats = loadData(groupStatsFile);
            const userStats = loadData(userStatsFile); // نحتاجها لأجل المغادرين والمضافين الإجمالي
            const dailyMessages = loadData(dailyMessagesFile);

            const threadInfo = await api.getThreadInfo(threadID);
            const admins = threadInfo.adminIDs || [];
            const memberCount = threadInfo.participantIDs.length;
            const threadName = threadInfo.threadName;

            const stats = groupStats[threadID] || {
                nameChanges: 0,
                photoChanges: 0,
                totalMessages: 0,
                departures: 0, // إجمالي المغادرين للمجموعة
                additions: 0 // إجمالي المضافين للمجموعة
            };

            // إيجاد الأكثر تفاعلاً أمس
            const yesterdayDate = moment().tz("Asia/Baghdad").subtract(1, 'days').format("YYYY-MM-DD");
            const yesterdayThreadMessages = dailyMessages[yesterdayDate]?.[threadID] || {};
            let mostActiveUser = null;
            let maxMessages = 0;

            for (const userID in yesterdayThreadMessages) {
                if (yesterdayThreadMessages[userID] > maxMessages) {
                    maxMessages = yesterdayThreadMessages[userID];
                    mostActiveUser = userID;
                }
            }

            let mostActiveInfo = "لا يوجد بيانات لأمس.";
            if (mostActiveUser) {
                const userInfo = await api.getUserInfo(mostActiveUser);
                const userName = userInfo[mostActiveUser]?.name || "مستخدم غير معروف";
                mostActiveInfo = `${userName} (${maxMessages} رسالة)`;
            }

            const response = `
╔═════ 「 إحصائيات المجموعة 」 ═════╗
║ 📚 اسم المجموعة: ${threadName}
║ 👥 الأعضاء الحاليون: ${memberCount}
║ 💬 إجمالي الرسائل: ${stats.totalMessages}
║ 🚶 إجمالي المغادرين: ${stats.departures}
║ ➕ إجمالي المضافين: ${stats.additions}
║ 🔄 مرات تغيير اسم المجموعة: ${stats.nameChanges} مرة
║ 🖼️ مرات تغيير صورة المجموعة: ${stats.photoChanges} مرة
║ 👑 عدد المشرفين: ${admins.length}
║ 📈 الأكثر تفاعلاً بالأمس: ${mostActiveInfo}
╚═════ 「 📊 」 ═════╝
            `;
            api.sendMessage(response, threadID, messageID);
        }, 5000);
        return;
    }

    // رسالة المساعدة الافتراضية
    const userInfo = await api.getUserInfo(senderID);
    const userName = userInfo[senderID].name;

    const helpMessage = `أهلاً يا ${userName}! إليك الأوامر المتاحة لك:
╭─❍「 🛠️ أدوات المطور 」
│ ✧ فحص [الرد/التاغ] - عرض معلومات مفصلة عن المستخدم.
│ ✧ ستارك - عرض قائمة بجميع كنيات أعضاء المجموعة.
│ ✧ لرس - عرض إحصائيات مفصلة عن المجموعة.
╰───────────⟡
├─────☾⋆
│ ملاحظة: هذه الأوامر مخصصة للمسؤولين فقط.
│「 سواد البغدادي 」
╰──────────⧕`;

    setTimeout(() => {
        api.sendMessage(helpMessage, threadID, messageID);
    }, 5000);
};

// 📥 handleEvent لجمع البيانات باستمرار
module.exports.handleEvent = async function({ api, event }) {
    const { threadID, senderID, logMessageType, logMessageData, body } = event;
    const currentTime = moment().tz("Asia/Baghdad");
    const todayDate = currentTime.format("YYYY-MM-DD");

    const userStats = loadData(userStatsFile);
    const groupStats = loadData(groupStatsFile);
    const dailyMessages = loadData(dailyMessagesFile);

    // تهيئة البيانات للمستخدم والمجموعة إذا لم تكن موجودة
    if (!userStats[senderID]) {
        userStats[senderID] = { totalMessages: 0, departures: 0, additions: 0 };
    }
    if (!groupStats[threadID]) {
        groupStats[threadID] = { nameChanges: 0, photoChanges: 0, totalMessages: 0, departures: 0, additions: 0 };
    }
    if (!dailyMessages[todayDate]) {
        dailyMessages[todayDate] = {};
    }
    if (!dailyMessages[todayDate][threadID]) {
        dailyMessages[todayDate][threadID] = {};
    }
    if (!dailyMessages[todayDate][threadID][senderID]) {
        dailyMessages[todayDate][threadID][senderID] = 0;
    }

    // 💬 تتبع عدد الرسائل
    if (body) {
        userStats[senderID].totalMessages++;
        groupStats[threadID].totalMessages++;
        dailyMessages[todayDate][threadID][senderID]++;
    }

    // 🔄 تتبع تغييرات المجموعة
    if (logMessageType) {
        switch (logMessageType) {
            case "log:thread-name":
                groupStats[threadID].nameChanges++;
                break;
            case "log:thread-image":
                groupStats[threadID].photoChanges++;
                break;
            case "log:subscribe":
                if (logMessageData.addedParticipants) {
                    logMessageData.addedParticipants.forEach(participant => {
                        const addedUserID = participant.userFbId;
                        if (!userStats[addedUserID]) userStats[addedUserID] = { totalMessages: 0, departures: 0, additions: 0 };
                        userStats[addedUserID].additions++;
                        groupStats[threadID].additions++; // تحديث لإجمالي المجموعة
                    });
                }
                break;
            case "log:unsubscribe":
                const leftUserID = logMessageData.leftParticipantFbId;
                if (!userStats[leftUserID]) userStats[leftUserID] = { totalMessages: 0, departures: 0, additions: 0 };
                userStats[leftUserID].departures++;
                groupStats[threadID].departures++; // تحديث لإجمالي المجموعة
                break;
        }
    }

    // 💾 حفظ البيانات
    saveData(userStatsFile, userStats);
    saveData(groupStatsFile, groupStats);
    saveData(dailyMessagesFile, dailyMessages);

    // 🧹 تنظيف بيانات الرسائل اليومية القديمة (للحفاظ على مساحة التخزين)
    const sevenDaysAgo = moment().tz("Asia/Baghdad").subtract(7, 'days').format("YYYY-MM-DD");
    for (const date in dailyMessages) {
        if (moment(date).isBefore(sevenDaysAgo)) {
            delete dailyMessages[date];
        }
    }
    saveData(dailyMessagesFile, dailyMessages);
};
