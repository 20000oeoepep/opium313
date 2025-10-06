// modules/groupStats.js
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "groupStats",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Group Stats Monitor",
  description: "عند كتابة 'لوست' يرسل تقرير عن المجموعة ومدة تشغيل البوت",
  commandCategory: "monitoring",
  usages: "لوست",
  cooldowns: 5,
};

const DATA_FILE = path.join(__dirname, 'group_stats_data.json');

let db = {}; // structure: { [threadID]: { messages, joins, leaves, kicked, membersStored, lastUpdate } }
let botStart = global.__groupStatsStart || Date.now();
let debug = false;

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ db, botStart }, null, 2), 'utf8');
    if (debug) console.log('[groupStats] saved data');
  } catch (e) {
    console.error('[groupStats] saveData error:', e);
  }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      db = parsed.db || {};
      botStart = parsed.botStart || botStart;
      global.__groupStatsStart = botStart;
      if (debug) console.log('[groupStats] loaded data');
    }
  } catch (e) {
    console.error('[groupStats] loadData error:', e);
    db = {};
  }
}

function ensure(threadID) {
  if (!db[threadID]) {
    db[threadID] = {
      messages: 0,
      joins: 0,
      leaves: 0,
      kicked: 0,
      membersStored: 0,
      lastUpdate: new Date().toISOString()
    };
  }
  return db[threadID];
}

function formatNumber(n) {
  try { return n.toLocaleString('ar-EG'); } catch { return String(n || 0); }
}

function formatDuration(ms) {
  let s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400); s %= 86400;
  const hours = Math.floor(s / 3600); s %= 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const parts = [];
  if (days) parts.push(`${days} يوم`);
  if (hours) parts.push(`${hours} ساعة`);
  if (minutes) parts.push(`${minutes} دقيقة`);
  parts.push(`${seconds} ثانية`);
  return parts.join('، ');
}

function nowArabic() {
  try {
    return new Date().toLocaleString('ar-SA', { hour12: false });
  } catch {
    return new Date().toISOString();
  }
}

// Try to fetch thread info (member count) with common api methods
function fetchThreadInfo(api, threadID) {
  return new Promise((resolve) => {
    // try getThreadInfo(callback)
    if (typeof api.getThreadInfo === 'function') {
      return api.getThreadInfo(threadID, (err, info) => {
        if (err) return resolve(null);
        // common shapes: info.participantIDs, info.participants, info.threadInfo.participantCount
        let count = null;
        if (info) {
          if (Array.isArray(info.participantIDs)) count = info.participantIDs.length;
          else if (Array.isArray(info.participants)) count = info.participants.length;
          else if (info.threadInfo && (info.threadInfo.participantCount || info.threadInfo.memberCount)) count = info.threadInfo.participantCount || info.threadInfo.memberCount;
          else if (info.memberCount || info.participantCount) count = info.memberCount || info.participantCount;
        }
        return resolve({ raw: info, memberCount: count });
      });
    }

    // try getThread (some libs)
    if (typeof api.getThread === 'function') {
      return api.getThread(threadID, (err, info) => {
        if (err) return resolve(null);
        let count = null;
        if (info) {
          if (Array.isArray(info.participantIDs)) count = info.participantIDs.length;
          else if (Array.isArray(info.participants)) count = info.participants.length;
          else if (info.memberCount || info.participantCount) count = info.memberCount || info.participantCount;
        }
        return resolve({ raw: info, memberCount: count });
      });
    }

    // fallback: not available
    return resolve(null);
  });
}

async function sendReport(api, threadID) {
  try {
    loadData();
    const st = ensure(threadID);

    // try to fetch real member count
    const fetched = await fetchThreadInfo(api, threadID);
    if (fetched && (fetched.memberCount !== null && fetched.memberCount !== undefined)) {
      st.membersStored = fetched.memberCount;
      st.lastUpdate = new Date().toISOString();
      saveData();
    }

    const uptime = formatDuration(Date.now() - botStart);

    const lines = [
      '📊 تقرير حالة المجموعة',
      '────────────────────────',
      `🕒 التاريخ والوقت: ${nowArabic()}`,
      `⏱️ مدة تشغيل البوت: ${uptime}`,
      '────────────────────────',
      `💬 عدد الرسائل: ${formatNumber(st.messages)}`,
      `👥 عدد الأعضاء: ${formatNumber(st.membersStored)}`,
      `🚪 عدد المغادرين: ${formatNumber(st.leaves)}`,
      `🔨 عدد المطرودين: ${formatNumber(st.kicked)}`,
      '────────────────────────',
      '✨ تقرير مرتب واحترافي — مقدم من نظام المراقبة'
    ];

    const message = { body: lines.join('\n') };

    // send message (callback optional)
    api.sendMessage(message, threadID, (err) => {
      if (err) console.error('[groupStats] sendReport sendMessage error:', err);
      try { if (typeof api.setMessageReaction === 'function') api.setMessageReaction('📈', null, () => {}); } catch (e) {}
    });
  } catch (e) {
    console.error('[groupStats] sendReport error:', e);
  }
}

// Main event handler
module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
  try {
    if (!db || Object.keys(db).length === 0) loadData();
    const { threadID, body, senderID, logMessageType, logMessageData } = event;
    const st = ensure(threadID);

    // 1) Count messages (text body)
    if (body && typeof body === 'string') {
      // increment messages (optionally skip bot's own messages if you can detect bot id)
      st.messages = (st.messages || 0) + 1;
      st.lastUpdate = new Date().toISOString();
      // save occasionally
      if (st.messages % 20 === 0) saveData();
    }

    // 2) Handle join/leave/kick via logMessageType or logMessageData
    if (logMessageType) {
      const t = String(logMessageType).toLowerCase();
      if (t.includes('subscribe')) {
        // new joins: logMessageData may include addedParticipants
        let added = 1;
        try {
          if (logMessageData && Array.isArray(logMessageData.addedParticipants)) added = logMessageData.addedParticipants.length || 1;
        } catch {}
        st.joins = (st.joins || 0) + added;
        st.membersStored = (st.membersStored || 0) + added;
        st.lastUpdate = new Date().toISOString();
        saveData();
      } else if (t.includes('unsubscribe')) {
        let left = 1;
        try {
          if (logMessageData && Array.isArray(logMessageData.leftParticipants)) left = logMessageData.leftParticipants.length || 1;
        } catch {}
        st.leaves = (st.leaves || 0) + left;
        st.membersStored = Math.max(0, (st.membersStored || 0) - left);
        st.lastUpdate = new Date().toISOString();
        saveData();
      } else if (t.includes('admin_remove') || t.includes('user_removed') || t.includes('remove')) {
        // admin removed / kicked
        let removed = 1;
        try {
          if (logMessageData && Array.isArray(logMessageData.removedParticipants)) removed = logMessageData.removedParticipants.length || 1;
        } catch {}
        st.kicked = (st.kicked || 0) + removed;
        st.membersStored = Math.max(0, (st.membersStored || 0) - removed);
        st.lastUpdate = new Date().toISOString();
        saveData();
      }
    }

    // 3) Command: "لوست" or "lost" -> send report
    if (body && typeof body === 'string') {
      const text = body.trim().toLowerCase();
      if (text === 'لوست' || text === 'lost' || text.includes('لوست') || text.includes('lost')) {
        await sendReport(api, threadID);
      }
    }
  } catch (e) {
    console.error('[groupStats] handleEvent error:', e);
  }
};

// run(): called on bot start
module.exports.run = function({ api, event, client, __GLOBAL }) {
  // set global start time once
  if (!global.__groupStatsStart) global.__groupStatsStart = botStart;
  botStart = global.__groupStatsStart;
  loadData();
  if (!global.__groupStatsMonitorStarted) {
    console.log('🔄 groupStats monitor started');
    global.__groupStatsMonitorStarted = true;
  }
};
