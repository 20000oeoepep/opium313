Module.exports.config = {
    name: "سلاحي",
    version: "1.0.2", // تم تحديث الإصدار
    hasPermssion: 0,
    credits: "احمد عجينة",
    description: "أنت بمواجهة زومبي والبوت يختار لك سلاحًا ويخبرك بنتيجة المواجهة.",
    commandCategory: "ترفية",
    usages: "",
    cooldowns: 5, // تم تعديل الكول داون ليتناسب مع التأخير
    dependencies: {
        "request": "",
        "fs-extra": "",
        "axios": "" // Axios ما زال مدرجًا ولكنه غير مستخدم مباشرة في هذا الكود.
    }
};

module.exports.run = async function({ api, event, args, client, Users, Threads, __GLOBAL, Currencies }) {
    // جلب اسم المستخدم
    const name = (await Users.getData(event.senderID)).name;

    // أرقام عشوائية للمواجهة
    const zombieCount = Math.floor(Math.random() * 150) + 50; // عدد الزومبي بين 50 و 200
    const bulletCount = Math.floor(Math.random() * 150) + 20; // عدد الطلقات بين 20 و 170
    const survivalChance = Math.floor(Math.random() * 101); // نسبة النجاة بين 0 و 100

    // قوائم الأسلحة والسيناريوهات
    const weaponNames = [
        "بندقية هجومية M4A1",
        "مسدس الصحراء (ديزرت إيجل)",
        "بندقية صيد (شوتجن)",
        "قاذف قنابل يدوية",
        "سكين قتالية",
        "سيبر الساموراي (كاتانا)",
        "المقلاة (سلاح طوارئ!)",
        "نعال مطاطي (فعّال ضد بعض أنواع الزومبي؟)",
        "قوس وسهم",
        "فأس إطفاء",
        "قناص AWM",
        "رشاش خفيف MP5"
    ];

    const scenarios = [
        "في سوبر ماركت مهجور وسط الظلام",
        "في زقاق مظلم مليء بالنفايات",
        "داخل مستشفى مهجور تنتشر فيه الأشباح",
        "في شوارع المدينة المدمرة تحت المطر",
        "أثناء تسللك عبر محطة قطار مترو أنفاق",
        "في مختبر سري تم التخلي عنه"
    ];

    // اختيار عشوائي للسلاح والسيناريو
    const chosenWeapon = weaponNames[Math.floor(Math.random() * weaponNames.length)];
    const chosenScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    // تحديد نتيجة المواجهة بناءً على نسبة النجاة
    let outcomeMessage;
    if (survivalChance >= 60) {
        outcomeMessage = `تهانينا، لقد نجوت من هذه المواجهة المرعبة ببراعة!`;
    } else if (survivalChance >= 30) {
        outcomeMessage = `لقد نجحت في صد الهجوم، ولكن بصعوبة بالغة. كنت على وشك أن تغلبك الأعداد!`;
    } else {
        outcomeMessage = `للأسف، الأعداد الهائلة من الزومبي غلبتك... لم تكن حظوظك جيدة هذه المرة.`;
    }

    // روابط صور الأسلحة (تم تنظيف القائمة لصور أكثر ملاءمة وبعض الفكاهية)
    const links = [
        "https://choq.fm/wp-content/uploads/2020/03/1585152608_370_%D8%A3%D9%81%D8%B6%D9%84-12-%D8%B3%D9%84%D8%A7%D8%AD-%D9%84%D9%80-Call-of-Duty-Warzone.jpg",
        "https://choq.fm/wp-content/uploads/2020/03/1585152608_73_%D8%A3%D9%81%D8%B6%D9%81-12-%D8%B3%D9%84%D8%A7%D8%AD-%D9%84%D9%80-Call-of-Duty-Warzone.jpg",
        "https://choq.fm/wp-content/uploads/2020/03/1585152607_81_%D8%A3%D9%81%D8%B6%D9%84-12-%D8%B3%D9%84%D8%A7%D8%AD-%D9%84%D9%80-Call-of-Duty-Warzone.jpg",
        "https://choq.fm/wp-content/uploads/2020/03/1585152607_207_%D8%A3%D9%81%D8%B6%D9%84-12-%D8%B3%D9%84%D8%A7%D8%AD-%D9%84%D9%80-Call-of-Duty-Warzone.jpg",
        "https://choq.fm/wp-content/uploads/2020/03/1585152607_48_%D8%A3%D9%81%D8%B6%D9%84-12-%D8%B3%D9%84%D8%A7%D8%AD-%D9%84%D9%80-Call-of-Duty-Warzone.jpg",
        "https://static1-arabia.millenium.gg/articles/7/14/37/@/8163-68712-1188612-m4a1-orig-1-orig-2-amp_main_img-1.png",
        "https://static1-us.millenium.gg/articles/6/68/76/@/71442-alpha-article_m-2.jpg",
        "http://www.ableammo.com/catalog/images/ssi/81474.jpg",
        "https://cdni.rt.com/media/pics/2013.12/orig/670358.jpg",
        "http://argaamplus.s3.amazonaws.com/2b89c76e-4c63-439e-ab19-2663ab21f177.jpg",
        "http://argaamplus.s3.amazonaws.com/f968479e-9dff-4e1c-b991-ead4b73de310.jpg",
        "https://pubgarabia.com/wp-content/uploads/2018/10/pubg_weapon_m416_1-1024x517.jpg",
        "https://png.pngtree.com/png-vector/20210313/ourlarge/pngtree-shoes-rubber-flip-flops-daily-necessities-household-png-image_3052390.jpg", // نعال
        "https://images-na.ssl-images-amazon.com/images/I/41MFZ4bNgqL.jpg" // نعال
    ];

    const request = global.nodemodule["request"];
    const fs = global.nodemodule["fs-extra"];

    // دالة الكول باك لرسالة الرد
    const sendMessageCallback = () => {
        api.sendMessage({
            body: `مرحباً بك يا ${name}!\n\n` +
                  `أنت تواجه موقفًا حرجًا ${chosenScenario}. \n` +
                  `هناك **${zombieCount}** من الزومبي يطاردونك!\n` +
                  `لديك **${bulletCount}** طلقة فقط في جعبتك.\n` +
                  `سلاحك المختار هو: **${chosenWeapon}**!\n\n` +
                  `نسبة نجاتك من هذه المعركة هي: **${survivalChance}%**.\n` +
                  `\n**النتيجة:** ${outcomeMessage}`,
            attachment: fs.createReadStream(__dirname + "/cache/weapon_image.jpg")
        }, event.threadID, () => {
            // حذف الصورة بعد إرسالها
            fs.unlinkSync(__dirname + "/cache/weapon_image.jpg");
        });
    };

    // تحميل الصورة وتأخير الرد
    request(encodeURI(links[Math.floor(Math.random() * links.length)]))
        .pipe(fs.createWriteStream(__dirname + "/cache/weapon_image.jpg"))
        .on("close", () => {
            // التأخير لمدة 5 ثوانٍ قبل إرسال الرسالة
            setTimeout(sendMessageCallback, 5000); // 5000 ملي ثانية = 5 ثوانٍ
        });
};
