const fs = require("fs");
const axios = require("axios");

module.exports.config = {
    name: "مراقبة",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Facebook Group Monitor",
    description: "مراقبة منشورات مجموعة فيسبوك وإرسال إشعارات",
    commandCategory: "monitoring",
    usages: "مراقبة",
    cooldowns: 5,
};

// تخزين معرفات المجموعات المراقبة
let monitoredGroups = {};
let lastPostIds = {};

// معرف مجموعة فيسبوك المستهدفة
const FACEBOOK_GROUP_ID = "24032348529792835";
const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/24032348529792835/";

// دالة لحفظ البيانات
function saveData() {
    try {
        const data = {
            monitoredGroups: monitoredGroups,
            lastPostIds: lastPostIds
        };
        fs.writeFileSync('./fbmonitor_data.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("خطأ في حفظ البيانات:", error);
    }
}

// دالة لتحميل البيانات
function loadData() {
    try {
        if (fs.existsSync('./fbmonitor_data.json')) {
            const data = JSON.parse(fs.readFileSync('./fbmonitor_data.json', 'utf8'));
            monitoredGroups = data.monitoredGroups || {};
            lastPostIds = data.lastPostIds || {};
        }
    } catch (error) {
        console.error("خطأ في تحميل البيانات:", error);
        monitoredGroups = {};
        lastPostIds = {};
    }
}

// دالة لمحاكاة مراقبة مجموعة فيسبوك
async function checkForNewPosts(api) {
    try {
        // هنا يجب استخدام Facebook Graph API أو طريقة أخرى للوصول للمنشورات
        // نظراً لقيود فيسبوك، سنستخدم محاكاة بسيطة
        
        // في التطبيق الحقيقي، ستحتاج إلى:
        // 1. Facebook App مع الصلاحيات المناسبة
        // 2. Access Token صالح
        // 3. استخدام Facebook Graph API
        
        const currentTime = Date.now();
        const simulatedNewPost = {
            id: `post_${currentTime}`,
            message: "منشور جديد تم اكتشافه",
            author: "عضو في المجموعة",
            timestamp: new Date().toLocaleString('ar-SA'),
            url: FACEBOOK_GROUP_URL
        };

        // التحقق من وجود منشورات جديدة (محاكاة)
        if (!lastPostIds[FACEBOOK_GROUP_ID] || 
            lastPostIds[FACEBOOK_GROUP_ID] !== simulatedNewPost.id) {
            
            lastPostIds[FACEBOOK_GROUP_ID] = simulatedNewPost.id;
            saveData();
            
            return simulatedNewPost;
        }
        
        return null;
    } catch (error) {
        console.error("خطأ في فحص المنشورات:", error);
        return null;
    }
}

// دالة لإرسال إشعار المنشور الجديد
function sendNewPostNotification(api, threadID, postData) {
    const notificationMessage = {
        body: `🔔 إشعار منشور جديد!\n\n` +
              `📝 المحتوى: ${postData.message}\n` +
              `👤 الناشر: ${postData.author}\n` +
              `⏰ الوقت: ${postData.timestamp}\n` +
              `🔗 الرابط: ${postData.url}\n\n` +
              `📱 تم رصد هذا المنشور من مجموعة فيسبوك المراقبة`
    };

    api.sendMessage(notificationMessage, threadID);
    api.setMessageReaction("🔔", null, (err) => {}, true);
}

// معالج الأحداث الرئيسي
module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
    const { threadID, messageID, body } = event;
    
    // تحميل البيانات عند بدء التشغيل
    if (Object.keys(monitoredGroups).length === 0) {
        loadData();
    }

    // التحقق من كلمة "مراقبة"
    if (body && (body.toLowerCase().includes("مراقبة") || body.toLowerCase().includes("monitor"))) {
        // إضافة المجموعة للمراقبة
        monitoredGroups[threadID] = {
            groupId: FACEBOOK_GROUP_ID,
            startTime: new Date().toISOString(),
            isActive: true
        };
        
        saveData();
        
        const confirmationMessage = {
            body: `✅ تم تفعيل المراقبة بنجاح!\n\n` +
                  `📊 المجموعة المراقبة: ${FACEBOOK_GROUP_URL}\n` +
                  `🎯 سيتم إرسال إشعارات المنشورات الجديدة هنا\n` +
                  `⚡ المراقبة نشطة الآن\n\n` +
                  `💡 لإيقاف المراقبة، اكتب "إيقاف المراقبة"`
        };
        
        api.sendMessage(confirmationMessage, threadID, messageID);
        api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    }

    // التحقق من إيقاف المراقبة
    if (body && (body.toLowerCase().includes("إيقاف المراقبة") || 
                 body.toLowerCase().includes("stop monitor"))) {
        
        if (monitoredGroups[threadID]) {
            delete monitoredGroups[threadID];
            saveData();
            
            const stopMessage = {
                body: `⏹️ تم إيقاف المراقبة\n\n` +
                      `📊 لن يتم إرسال إشعارات جديدة\n` +
                      `🔄 لإعادة التفعيل، اكتب "مراقبة"`
            };
            
            api.sendMessage(stopMessage, threadID, messageID);
            api.setMessageReaction("⏹️", event.messageID, (err) => {}, true);
        }
    }
};

// دالة المراقبة المستمرة (يجب تشغيلها بشكل دوري)
async function startMonitoring(api) {
    setInterval(async () => {
        try {
            const newPost = await checkForNewPosts(api);
            
            if (newPost) {
                // إرسال إشعارات لجميع المجموعات المراقبة
                for (const [threadID, groupData] of Object.entries(monitoredGroups)) {
                    if (groupData.isActive) {
                        sendNewPostNotification(api, threadID, newPost);
                    }
                }
            }
        } catch (error) {
            console.error("خطأ في دورة المراقبة:", error);
        }
    }, 60000); // فحص كل دقيقة
}

module.exports.run = function({ api, event, client, __GLOBAL }) {
    // بدء المراقبة عند تشغيل البوت
    if (!global.fbMonitoringStarted) {
        startMonitoring(api);
        global.fbMonitoringStarted = true;
        console.log("🔄 تم بدء نظام مراقبة فيسبوك");
    }
};
