module.exports.config = {
    name: "oneTwoResponder",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "سواد البغدادي",
    description: "رد تلقائي على 1 و 2",
    commandCategory: "no prefix",
    usages: "1 أو 2",
    cooldowns: 2,
};

module.exports.handleEvent = function({ api, event }) {
    const { threadID, messageID, body } = event;

    if (!body) return;

    const text = body.trim();

    if (text === "1") {
        api.sendMessage("الحمدلله", threadID, messageID);
    }

    if (text === "2") {
        api.sendMessage("دائماً وأبداً", threadID, messageID);
    }
};

module.exports.run = function({ api, event }) {
    // هذا الأمر لا يستخدم أمر مباشر، فقط من خلال handleEvent
};
