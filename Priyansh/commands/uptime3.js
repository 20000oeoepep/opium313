const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "لوست",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Group Stats Monitor",
  description: "عند كتابة 'لوست' يرسل تقرير احترافي عن حالة المجموعة ومدة تشغيل البوت",
  commandCategory: "monitoring",
  usages: "لوست",
  cooldowns: 5,
};

// ---- بيانات ومسارات الملفات ----
const DATA_FILE = path.join(__dirname, 'fbmonitor_stats.json');

let stats = {}; // هيكل: { [threadID]: { messages: number, joins: number, leaves: number, kicked: number, membersStored: number, lastUpdate: ISOString } }
let botStart = (global._groupStatsBotStart) ? global._groupStatsBotStart : Date.now();

// ---- حفظ / تحميل ----
function saveData() {
  try {
    const data = { stats, botStart };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('خطأ في حفظ بيانات المراقبة:', err);
  }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      stats = data.stats || {};
      botStart = data.botStart || botStart;
      global._groupStatsBotStart = botStart;
    }
  } catch (err) {
    console.error('خطأ في تحميل بيانات المراقبة:', err);
    stats = {};
  }
}

// ---- مساعدة تنسيقات ----
function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  return n.toLocaleString('ar-EG');
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDuration(ms) {
  let s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400); s %= 86400;
  const hours = Math.floor(s / 3600); s %= 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const parts = [];
  if (days) parts.push(`${days} يوم${days > 1 ? '' : ''}`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  parts.push(`${seconds} ثانية`);
  return parts.join('، ');
}

function nowArabicString() {
  const d = new Date();
  // خيارات لتنسيق عربي
  return d.toLocaleString('ar-SA', { hour12: false });
}

// ---- تحديث العدادات ----
function ensureThreadStat(threadID) {
  if (!stats[threadID]) {
    stats[threadID] = {
      messages: 0,
      joins: 0,
      leaves: 0,
      kicked: 0,
      membersStored: 0,
      lastUpdate: new Date().toISOString()
    };
  }
  return stats[threadID];
}

// ---- دالة محاولة جلب معلومات المجموعة الحقيقية إن أتاح api ذلك ----
async function fetchThreadInfoIfPossible(api, threadID) {
  // بعض مكتبات الـ API توفر getThreadInfo أو getThreadInfoAsync أو getThread
  const infoFetchers = [
    api.getThreadInfo ? 'getThreadInfo' : null,
    api.getThread ? 'getThread' : null,
    api.getThreadInfoAsync ? 'getThreadInfoAsync' : null
  ].filter(Boolean);

  for (const fn of infoFetchers) {
    try {
      const res = await new Promise((resolve, reject) => {
        const cb = (err, data) => (err ? reject(err) : resolve(data));
        // استدعاء الديناميكي
        if (fn === 'getThreadInfo') return api.getThreadInfo(threadID, cb);
        if (fn === 'getThread') return api.getThread(threadID, cb);
        if (fn === 'getThreadInfoAsync') return api.getThreadInfoAsync(threadID).then(resolve).catch(reject);
      });
      // المحتوى يختلف باختلاف المكتبة؛ نحاول استخراج عدد الأعضاء
      if (res && (res.participantIDs || res.participants || res.threadInfo || res.participantIDs)) {
        const memberCount = res.participantIDs ? res.participantIDs.length : (res.participants ? res.participants.length : (res.threadInfo && res.threadInfo.participantCount ? res.threadInfo.participantCount : null));
        return { raw: res, memberCount: memberCount };
      }
      // أو عدد الأعضاء قد يكون مباشرة res.memberCount أو res.participantCount
      if (res && (res.memberCount || res.participantCount)) {
        return { raw: res, memberCount: res.memberCount || res.participantCount };
      }
      // كخيار أخير، إذا كانت البنية تحتوي على 'participantIDs' في أي مكان:
      if (res && typeof res === 'object') {
        for (const k of Object.keys(res)) {
          const v = res[k];
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
            // افتراض أن هذا مصفوفة معرفات أعضاء
            return { raw: res, memberCount: v.length };
          }
        }
      }
    } catch (e) {
      // تجاهل الأخطاء وجرب الطريقة التالية
      // console.warn('fetchThreadInfo method', fn, 'failed:', e && e.message);
    }
  }
  return null;
}

// ---- رسالة تقرير احترافية ----
async function sendReport(api, threadID) {
  try {
    loadData();
    ensureThreadStat(threadID);

    const threadStats = stats[threadID];
    // حاول الحصول على عدد الأعضاء الحقيقي، وإلا استخدم المخزن
    let memberCount = threadStats.membersStored;
    const fetched = await fetchThreadInfoIfPossible(api, threadID);
    if (fetched && fetched.memberCount !== null && fetched.memberCount !== undefined) {
      memberCount = fetched.memberCount;
      // خزّن القيمة كاحتياط
      threadStats.membersStored = memberCount;
      threadStats.lastUpdate = new Date().toISOString();
      saveData();
    }

    const uptime = Date.now() - botStart;
    const uptimeStr = formatDuration(uptime);

    const messageParts = [];
    messageParts.push("📊 *تقرير حالة المجموعة*");
    messageParts.push("───────────────────");
    messageParts.push(`🕒 *الوقت والتاريخ:* ${nowArabicString()}`);
    messageParts.push(`⏱️ *مدة تشغيل البوت:* ${uptimeStr}`);
    messageParts.push("───────────────────");
    messageParts.push(`💬 *عدد رسائل المجموعة:* ${formatNumber(threadStats.messages)}`);
    messageParts.push(`👥 *عدد الأعضاء:* ${formatNumber(memberCount)}`);
    messageParts.push(`🚪 *عدد المغادرين:* ${formatNumber(threadStats.leaves)}`);
    messageParts.push(`🔨 *عدد المطرودين:* ${formatNumber(threadStats.kicked)}`);
    messageParts.push("───────────────────");
    messageParts.push("🔔 *ملاحظة:* الأرقام تُحدّث تلقائياً عند حدوث أحداث المجموعة. يمكنك حفظ البيانات أو إعادة تشغيل البوت للاحتفاظ بالإحصاءات.");
    messageParts.push("");
    messageParts.push("✨ *تقرير احترافي — إدارة ومراقبة متقدمة*");

    const finalMessage = { body: messageParts.join('\n') };

    api.sendMessage(finalMessage, threadID);
    try { api.setMessageReaction("📈", null, ()=>{}, true); } catch(e) {}
  } catch (err) {
    console.error('خطأ أثناء إرسال التقرير:', err);
  }
}

// ---- المعالج الرئيسي للأحداث ----
module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
  // تحميل البيانات أول مرة
  if (Object.keys(stats).length === 0) loadData();

  const { threadID, body, senderID, logMessageType } = event;

  // تأكد من وجود مدخلات الإحصاء للمحادثة
  const threadStats = ensureThreadStat(threadID);

  // 1) تحديث عداد الرسائل عندما يكون هناك رسالة نصية عادية
  try {
    // بعض الـ API يضع messageType أو type; هنا نفترض أن وجود body يعني رسالة نصية
    if (body && typeof body === 'string') {
      // تجاهل أوامر البوت نفسها - إن رغبت بإمكانك منع زيادة العداد عند رسالة من البوت نفسه
      if (!senderID || senderID !== (api.getCurrentUserID ? api.getCurrentUserID() : null)) {
        threadStats.messages = (threadStats.messages || 0) + 1;
        threadStats.lastUpdate = new Date().toISOString();
        // حفظ دوري خفيف - كل 20 رسالة نكتب الملف
        if (threadStats.messages % 20 === 0) saveData();
      }
    }
  } catch (e) {
    // لا توقف التنفيذ إن فشل التحديث
    console.error('خطأ تحديث عداد الرسائل:', e && e.message);
  }

  // 2) التعامل مع أحداث الانضمام/المغادرة/الطرد إن توفرت
  // أنواع شائعة: 'log:subscribe' (انضمام), 'log:unsubscribe' (مغادرة), 'log:admin_remove' أو 'log:user_removed' للطرد
  try {
    if (logMessageType) {
      const t = logMessageType.toLowerCase();
      if (t.includes('subscribe')) {
        threadStats.joins = (threadStats.joins || 0) + 1;
        threadStats.membersStored = (threadStats.membersStored || 0) + 1;
        threadStats.lastUpdate = new Date().toISOString();
        saveData();
      } else if (t.includes('unsubscribe')) {
        threadStats.leaves = (threadStats.leaves || 0) + 1;
        // membersStored قد ينخفض إن أردنا
        threadStats.membersStored = Math.max(0, (threadStats.membersStored || 0) - 1);
        threadStats.lastUpdate = new Date().toISOString();
        saveData();
      } else if (t.includes('admin_remove') || t.includes('user_removed') || t.includes('remove')) {
        threadStats.kicked = (threadStats.kicked || 0) + 1;
        threadStats.membersStored = Math.max(0, (threadStats.membersStored || 0) - 1);
        threadStats.lastUpdate = new Date().toISOString();
        saveData();
      }
    }
  } catch (e) {
    console.error('خطأ في معالجة أحداث الانضمام/المغادرة:', e && e.message);
  }

  // 3) التحقق من أمر "لوست" لإرسال التقرير
  try {
    if (body && typeof body === 'string') {
      const text = body.trim().toLowerCase();
      if (text === 'لوست' || text === 'lost' || text.includes('لوست') || text.includes('lost')) {
        // أرسل التقرير
        await sendReport(api, threadID);
      }
    }
  } catch (e) {
    console.error('خطأ أثناء تشغيل أمر اللوست:', e && e.message);
  }
};

// ---- دالة run لتشغيل أي مهام عند بدء البوت ----
module.exports.run = function({ api, event, client, __GLOBAL }) {
  // ضبط وقت بدء البوت عالمياً مرة واحدة
  if (!global._groupStatsBotStart) {
    global._groupStatsBotStart = botStart;
  } else {
    botStart = global._groupStatsBotStart;
  }

  // تحميل بيانات (مرة واحدة)
  loadData();

  // سجل جاهزية في الكونسول
  if (!global._groupStatsMonitorStarted) {
    console.log("🔄 تم تشغيل Group Stats Monitor");
    global._groupStatsMonitorStarted = true;
  }
};
