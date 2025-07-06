module.exports.config = {
    name: "werewolves",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "الانضمام إلى لعبة الذئاب",
    commandCategory: "لعبة",
    usages: "",
    cooldowns: 5,
};

module.exports.languages = {
    "ar": {
        "notDeveloper": "عذراً، أنت لست المطور.",
        "welcome": "مرحباً بكم في لعبة الذئاب! للمشاركة، يرجى الرد على هذه الرسالة بكلمة 'تم' أو 'نعم'.",
        "success": "لقد انضممت إلى اللعبة بنجاح ✅"
    }
};

module.exports.run = async ({ api, event, getText }) => {
    const { threadID, messageID, senderID } = event;
    
    // التحقق مما إذا كان المستخدم هو المطور
    if (senderID !== "100015903097543") {
        return api.sendMessage(getText("notDeveloper"), threadID, messageID);
    }

    // إرسال رسالة ترحيب باللعبة
    api.sendMessage(getText("welcome"), threadID, messageID);

    // الاستماع لردود الأعضاء في المجموعة
    const handleReply = (event) => {
        const { senderID, body } = event;
        if (body.toLowerCase() === "تم" || body.toLowerCase() === "نعم") {
            api.sendMessage(getText("success"), senderID);
        }
    };

    // إعداد مستمع للردود
    api.listen(handleReply);
};
