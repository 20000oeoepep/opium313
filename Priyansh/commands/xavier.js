module.exports.config = {
    name: "اوامر",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "احمد عجينة",
    description: "اقتراحات انمي",
    commandCategory: "ترفية",
    usages: "ا",
    cooldowns: 5,
    dependencies: {
        "request": "",
        "fs-extra": "",
        "axios": ""
    }
};

module.exports.run = async({ api, event, args, client, Users, Threads, __GLOBAL, Currencies }) => {
    const axios = global.nodemodule["axios"];
    const request = global.nodemodule["request"];
    const fs = global.nodemodule["fs-extra"];
    var ZiaRein = [
        "https://up6.cc/2025/07/175144632227971.gif",
    ];
    
    var commandList = `
📜︙قـائـمة الأوامـر︙📜
╭━━━[ 🧠 الأوامـر الذكـيـة ]━━━╮
┃ 🔹 • … الأوامر
┃ 🔹 • …صور 
┃ 🔹 • …صارحني
╰━━━━━━━━━━━━━━━
╭━━━[ ⚙️ أوامـر الإداريـن ]━━━╮
┃ 🚫 • … صيانة 
┃ 🛡️ • …صيانة
┃ 🧹 • … صيانة
╰━━━━━━━━━━━━━━
1 اسم البوت: ريو
2 البريفسكس: ريو
3 سرعة التشغيل: 
المطور [ڛواد البغدادي] 
━━━━━━━━━━━━━━━`;

    var ZiaRein2 = () => {
        setTimeout(() => {
            api.sendMessage({body: commandList, attachment: fs.createReadStream(__dirname + "/cache/ZiaRein1.jpg")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/ZiaRein1.jpg"), event.messageID);
        }, 5000); // تأخير لمدة 5 ثوانٍ
    };
    
    return request(encodeURI(ZiaRein[Math.floor(Math.random() * ZiaRein.length)])).pipe(fs.createWriteStream(__dirname + "/cache/ZiaRein1.jpg")).on("close", () => ZiaRein2());
};
