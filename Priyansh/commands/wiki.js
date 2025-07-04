module.exports.config = {
    name: "بكج",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "احمد عجينة",
    description: "اقتراحات انمي",
    commandCategory: "ترفية",
    usages: "ريو بكج",
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
        "https://up6.cc/2024/05/171511442773871.jpg",
        "https://up6.cc/2024/05/17151144798821.jpg",
        "https://up6.cc/2024/05/171511454154021.jpg",
        "https://up6.cc/2024/05/171511457748551.jpg",
    ];

    const { getData, setData } = Currencies;
    const moneyUser = (await getData(event.senderID)).money;

    if (args[0] !== "ريو" || args[1] !== "بكج") {
        return api.sendMessage("استخدم الأمر بشكل صحيح: ريو بكج", event.senderID);
    }

    if (moneyUser < 1000) {
        return api.sendMessage("عذرًا، لا تملك ما يكفي من الأموال للقيام بهذا الإجراء.", event.senderID, event.messageID);
    } else {
        await setData(event.senderID, { money: moneyUser - 1000 });
        var callback = () => api.sendMessage({
            body: `شكرًا وتهانينا على حصولك على تصميم عشوائي! نأمل أن يكون النتيجة مرضية وتلبي توقعاتك. بالنسبة للخصم الذي تم تطبيقه على حسابك بقيمة 20 عملة M.V، يرجى التواصل مع فريق الدعم لدينا لمعرفة المزيد من التفاصيل والتوضيحات. نحن هنا لمساعدتك وضمان رضاك التام.⚜️🔸`,
            attachment: fs.createReadStream(__dirname + "/cache/ZiaRein1.jpg")
        }, event.senderID, () => fs.unlinkSync(__dirname + "/cache/ZiaRein1.jpg"), event.messageID);
        
        return request(encodeURI(ZiaRein[Math.floor(Math.random() * ZiaRein.length)])).pipe(fs.createWriteStream(__dirname + "/cache/ZiaRein1.jpg")).on("close", () => callback());
    }
};
