const fs = require("fs");

module.exports.config = {
    name: "RioNotification",
    version: "1.0.0",
    hasPermssion: 2, // Admin permission to send notifications to all groups
    credits: "سواد البغدادي",
    description: "Sends a notification to all groups with bot, developer, date/time, group info, and bot stats.",
    commandCategory: "admin",
    usages: "RioNotification",
    cooldowns: 300, // Cooldown in seconds (5 minutes)
};

module.exports.run = async function({ api, event, client, __GLOBAL }) {
    const botName = "ريو";
    const developerName = "سواد البغدادي";
    const dateTime = new Date().toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" });

    try {
        const threadList = await api.getThreadList(200, null, ["INBOX"]); // Get up to 200 threads

        for (const threadInfo of threadList) {
            if (threadInfo.isGroup && threadInfo.threadID !== event.threadID) { // Only send to groups, exclude the current one
                try {
                    const threadDetails = await api.getThreadInfo(threadInfo.threadID);
                    
                    const groupName = threadDetails.threadName;
                    const memberCount = threadDetails.participantIDs.length;
                    const messageCount = threadDetails.messageCount;
                    
                    // You'll need to implement logic to get the command count for your bot.
                    // This is a placeholder and assumes a global variable or function exists.
                    const commandCount = Object.keys(client.commands).length; // Example if client.commands holds all commands

                    const msg = `
📣 **إشعار من البوت** 📣
---
**اسم البوت**: ${botName}
**المطور**: ${developerName}
**التاريخ والوقت**: ${dateTime}

**معلومات المجموعة**:
- **اسم المجموعة**: ${groupName}
- **عدد الأعضاء**: ${memberCount}
- **عدد الرسائل**: ${messageCount}
- **عدد الأوامر في البوت**: ${commandCount}
                    `;
                    api.sendMessage(msg, threadInfo.threadID);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to avoid API rate limits
                } catch (error) {
                    console.error(`Failed to send notification to thread ${threadInfo.threadID}:`, error);
                }
            }
        }
        api.sendMessage("تم إرسال الإشعارات إلى جميع المجموعات بنجاح!", event.threadID);
    } catch (error) {
        console.error("Failed to retrieve thread list:", error);
        api.sendMessage("فشل في إرسال الإشعارات. الرجاء التحقق من السجلات.", event.threadID);
    }
};
