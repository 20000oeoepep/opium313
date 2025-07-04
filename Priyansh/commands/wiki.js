const fs = require("fs");

// --- إدارة حالة اللعبة ---
let gameData = {};
const GAME_DATA_FILE = __dirname + "/werewolf_game_data.json"; // مسار ملف حفظ بيانات اللعبة

function loadGameData() {
    try {
        gameData = JSON.parse(fs.readFileSync(GAME_DATA_FILE, "utf8"));
    } catch (e) {
        console.error("فشل تحميل بيانات اللعبة أو الملف غير موجود. تهيئة بيانات جديدة.", e);
        gameData = {}; // تهيئة إذا كان الملف غير موجود أو غير صالح
    }
}

function saveGameData() {
    try {
        fs.writeFileSync(GAME_DATA_FILE, JSON.stringify(gameData, null, 2), "utf8");
    } catch (e) {
        console.error("فشل حفظ بيانات اللعبة:", e);
    }
}

loadGameData(); // تحميل البيانات عند بدء تشغيل البوت

// --- إعدادات اللعبة ---
const gameConfig = {
    minPlayers: 4, // الحد الأدنى لعدد اللاعبين المطلوبين لبدء اللعبة
    maxPlayers: 15, // الحد الأقصى لعدد اللاعبين المسموح به
    adminID: "100015903097543", // <<<<< يرجى التغيير إلى معرف فيسبوك الخاص بالمسؤول الفعلي
    roles: [ // تعريف الأدوار المتاحة (قاتل واحد، شرطي واحد، والباقي قرويون)
        { name: "قاتل", type: "killer" },
        { name: "شرطي", type: "police" },
        { name: "قروي", type: "villager" }
    ],
    votingTime: 60000 // 60 ثانية للتصويت
};

module.exports.config = {
    name: "werewolf_game",
    version: "2.1.0", // رقم الإصدار المحدث
    hasPermssion: 0,
    credits: "Your Name", // غيّر هذا إلى اسمك
    description: "لعبة مستوحاة من Werewolf مع تحكمات إدارية.",
    commandCategory: "Game",
    usages: "المشاركين | ابدا | ابدا اللعبة | ابدا تصويت | إلغاء اللعبة",
    cooldowns: 5,
};

// --- وظائف مساعدة ---

/**
 * يوزع الأدوار (قاتل واحد، شرطي واحد، والباقي قرويون) على اللاعبين.
 * @param {Array} players - مصفوفة من كائنات اللاعبين {userID, name}.
 * @returns {Array} - اللاعبون مع أدوارهم وأرقامهم المخصصة.
 */
function assignRoles(players) {
    // إنشاء نسخة قابلة للتعديل من اللاعبين وخلطهم
    let shuffledPlayers = [...players].sort(() => 0.5 - Math.random());

    let assignedPlayers = [];
    let killerAssigned = false;
    let policeAssigned = false;

    // تعيين الأدوار بناءً على الترتيب العشوائي الأولي
    for (let i = 0; i < players.length; i++) {
        let player = shuffledPlayers[i];
        let role = "قروي"; // الدور الافتراضي هو قروي

        if (!killerAssigned) {
            role = "قاتل";
            killerAssigned = true;
        } else if (!policeAssigned) {
            role = "شرطي";
            policeAssigned = true;
        }
        
        assignedPlayers.push({
            userID: player.userID,
            name: player.name,
            role: role,
            playerNumber: i + 1, // تعيين أرقام اللاعبين بالتسلسل بعد الخلط
            isAlive: true,
            votes: 0
        });
    }

    // خلط اللاعبين المعينين مرة أخرى لتوزيع الأرقام بشكل عشوائي ظاهريًا
    assignedPlayers.sort(() => 0.5 - Math.random());
    assignedPlayers.forEach((p, index) => p.playerNumber = index + 1);

    return assignedPlayers;
}


/**
 * ينشئ قصة قصيرة لبداية اللعبة أو لنتائج اليوم الجديد.
 * @param {string} type - 'start' أو 'day_outcome' أو 'police_wrong_guess'.
 * @param {object} gameInfo - معلومات حالة اللعبة الحالية (مثل اللاعب المقتول، اللاعب المحمي).
 * @returns {string} - نص القصة.
 */
function generateStory(type, gameInfo = {}) {
    let story = "";
    const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const randomDay = days[Math.floor(Math.random() * days.length)];
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinute = Math.floor(Math.random() * 60);

    if (type === "start") {
        story = `
            في ليلة حالكة الظلام من يوم ${randomDay}، عند الساعة ${randomHour}:${randomMinute.toString().padStart(2, '0')}،
            انتشر الرعب في القرية. همسات مخيفة تتسلل بين المنازل،
            فالقاتل يتربص بالضحايا الأبرياء.
            من سيكون الضحية الأولى؟ ومن سيكشف القاتل قبل فوات الأوان؟
            الجميع في خطر!
        `;
    } else if (type === "day_outcome") {
        const { killedPlayer, protectedPlayer, killerChosenNumber, policeChosenNumber } = gameInfo;

        if (killedPlayer) { // تم استهداف شخص
            if (protectedPlayer && killerChosenNumber === policeChosenNumber) {
                story = `
                    في صباح يوم ${randomDay}، وبينما كان القاتل يتربص بضحية جديدة،
                    تدخل البطل الخفي! لقد تمكن الشرطي السري من حماية **${killedPlayer.name}** (رقم ${killedPlayer.playerNumber}) في اللحظة الأخيرة.
                    نجا **${killedPlayer.name}** بأعجوبة من الموت المحقق!
                    القرية تتنفس الصعداء، ولكن الخطر ما زال قائماً.
                `;
            } else {
                story = `
                    في صباح يوم جديد من ${randomDay}، وعند الفجر،
                    استيقظت القرية على صرخات مفزعة!
                    تم العثور على جثة **${killedPlayer.name}** (رقم ${killedPlayer.playerNumber}) ملقاة...
                    لقد مات **${killedPlayer.name}** بشكل مأساوي على يد القاتل!
                    فليرقد بسلام.
                `;
            }
        } else { // لم يتم قتل أو استهداف أحد
            story = `
                في صباح يوم ${randomDay}، يبدو أن القرية قد نجت من ليلة هادئة.
                لم يقع أي ضحايا هذه الليلة...
                هل اختبأ القاتل أم كان حظ القرية جيدًا؟
             `;
        }
    } else if (type === "police_wrong_guess") {
        const { killedPlayer } = gameInfo;
        story = `
            في صباح يوم ${randomDay}، وبينما كان القاتل يخطط لضحيته،
            قام الشرطي بحماية شخص آخر. للأسف، لم يتمكن الشرطي من منع الجريمة هذه المرة.
            القاتل ترك **${killedPlayer.name}** (رقم ${killedPlayer.playerNumber}) جثة هامدة!
            الحماية لم تكن في المكان الصحيح هذه المرة.
         `;
    }

    return story.trim();
}

/**
 * يرسل مؤشر الكتابة ثم الرسالة.
 * @param {object} api - كائن API.
 * @param {string} threadID - معرف المحادثة.
 * @param {string} message - الرسالة المراد إرسالها.
 * @param {number} delayMs - التأخير بالمللي ثانية قبل إرسال الرسالة.
 */
function sendTypingMessage(api, threadID, message, delayMs = 2000) {
    return new Promise(resolve => {
        api.sendTypingIndicator(threadID, () => {
            setTimeout(() => {
                api.sendMessage(message, threadID, (err, info) => {
                    if (err) console.error("خطأ في إرسال الرسالة:", err);
                    resolve(info);
                });
            }, delayMs);
        });
    });
}

// --- وظائف منطق اللعبة الرئيسية ---

async function startGamePhase1(api, threadID) {
    const game = gameData[threadID];
    if (!game || game.status !== "joining") {
        return api.sendMessage("لا توجد لعبة قيد الانتظار للبدء في هذه المجموعة.", threadID);
    }

    const currentPlayers = Object.values(game.players);

    if (currentPlayers.length < gameConfig.minPlayers) {
        return api.sendMessage(`عذراً، نحتاج إلى ${gameConfig.minPlayers} لاعبين على الأقل لبدء اللعبة. العدد الحالي هو ${currentPlayers.length}.`, threadID);
    }
    if (currentPlayers.length > gameConfig.maxPlayers) {
        return api.sendMessage(`عذراً، الحد الأقصى للاعبين هو ${gameConfig.maxPlayers}. العدد الحالي هو ${currentPlayers.length}.`, threadID);
    }

    const assignedPlayers = assignRoles(currentPlayers);
    game.players = {}; // إعادة تعيين كائن اللاعبين
    assignedPlayers.forEach(p => {
        game.players[p.userID] = p;
    });
    game.killer = assignedPlayers.find(p => p.role === "قاتل");
    game.police = assignedPlayers.find(p => p.role === "شرطي");
    game.status = "roles_assigned";

    saveGameData();

    // إبلاغ اللاعبين سريًا بأدوارهم
    for (const player of assignedPlayers) {
        await api.sendMessage(
            `مرحباً ${player.name}!\nشخصيتك في اللعبة هي: **${player.role}**.\nرقمك في اللعبة هو: **${player.playerNumber}**.`,
            player.userID // <--- هنا يتم إرسال الرسالة بشكل خاص لكل لاعب
        ).catch(e => console.error(`خطأ في إرسال رسالة خاصة إلى ${player.name} (${player.userID}):`, e));
    }

    api.sendMessage(`تم توزيع الأدوار للمشاركين!`, threadID);
    api.sendMessage(`أيها المسؤول، قل 'ابدا اللعبة' لبدء اللعب.`, threadID);
}

async function startGamePhase2(api, threadID) {
    const game = gameData[threadID];
    if (!game || game.status !== "roles_assigned") {
        return api.sendMessage("الأدوار لم توزع بعد أو اللعبة ليست جاهزة للبدء.", threadID);
    }

    game.status = "night_killer_phase"; // المرحلة الأولى: القاتل يختار
    saveGameData();

    // بدء قصة اللعبة
    await sendTypingMessage(api, threadID, generateStory("start"), 3000);

    // مطالبة القاتل باختيار الضحية
    await promptKiller(api, threadID);

    saveGameData();
}

async function promptKiller(api, threadID) {
    const game = gameData[threadID];
    if (!game || !game.killer || !game.killer.isAlive) {
        // إذا كان القاتل ميتاً أو غير موجود في اللعبة، انتقل مباشرة إلى النتائج
        return processNightOutcome(api, threadID);
    }

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive && p.userID !== game.killer.userID);
    if (alivePlayers.length === 0) {
        // جميع اللاعبين الآخرين ميتون، القاتل يفوز!
        api.sendMessage(`لم يتبق أحد ليقتله القاتل! 🎉 **لقد فاز القاتل!**`, threadID);
        delete gameData[threadID];
        saveGameData();
        return;
    }

    let playerList = "الرجاء قم باختيار الشخص الذي تريده كضحيتك من خلال رقمه:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
    });

    game.currentAction = {
        type: "killer_choice",
        promptMessageID: null, // لتخزين معرف الرسالة للردود
        threadID: threadID // تخزين معرف المحادثة للتعامل مع الاستجابة الخاصة
    };
    saveGameData();

    const killerMessage = `
        أيها **القاتل**! حان دورك.\n
        ${playerList}
        الرجاء الرد على هذه الرسالة برقم الضحية.
    `;
    api.sendMessage(killerMessage, game.killer.userID, (err, info) => {
        if (!err && info) {
            game.currentAction.promptMessageID = info.messageID;
            saveGameData();
        } else {
            console.error("خطأ في إرسال مطالبة القاتل:", err);
        }
    });

    api.sendMessage(`القاتل يختار ضحيته في صمت...`, threadID);
}

async function promptPolice(api, threadID) {
    const game = gameData[threadID];
    if (!game || !game.police || !game.police.isAlive) {
        // إذا كان الشرطي ميتاً أو غير موجود في اللعبة، انتقل مباشرة إلى النتائج
        return processNightOutcome(api, threadID);
    }

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    if (alivePlayers.length === 0) {
        return api.sendMessage("لا يوجد أحد ليقوم الشرطي بحمايته. تنتهي اللعبة.", threadID); // يجب ألا يحدث هذا إذا كان القاتل قد اختار بالفعل
    }

    let playerList = "الرجاء قم باختيار الشخص الذي تريد حمايته من خلال رقمه:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
    });

    game.currentAction = {
        type: "police_choice",
        promptMessageID: null,
        threadID: threadID
    };
    saveGameData();

    const policeMessage = `
        أيها **الشرطي**! حان دورك.\n
        ${playerList}
        الرجاء الرد على هذه الرسالة برقم الشخص الذي ستحميه.
    `;
    api.sendMessage(policeMessage, game.police.userID, (err, info) => {
        if (!err && info) {
            game.currentAction.promptMessageID = info.messageID;
            saveGameData();
        } else {
            console.error("خطأ في إرسال مطالبة الشرطي:", err);
        }
    });

    api.sendMessage(`الشرطي يقرر من سيحميه...`, threadID);
}

async function processNightOutcome(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    await sendTypingMessage(api, threadID, "مرت ليلة أخرى في القرية...", 2000);

    const killerChosenPlayer = game.killerChoice ? Object.values(game.players).find(p => p.playerNumber === game.killerChoice) : null;
    const policeChosenPlayer = game.policeChoice ? Object.values(game.players).find(p => p.playerNumber === game.policeChoice) : null;

    let killedPlayer = null;
    let gameInfo = {
        killerChosenNumber: killerChosenPlayer ? killerChosenPlayer.playerNumber : null,
        policeChosenNumber: policeChosenPlayer ? policeChosenPlayer.playerNumber : null
    };

    if (killerChosenPlayer) { // القاتل اختار شخصاً
        gameInfo.killedPlayer = killerChosenPlayer;
        if (policeChosenPlayer && killerChosenPlayer.playerNumber === policeChosenPlayer.playerNumber) {
            // محمي!
            gameInfo.protectedPlayer = policeChosenPlayer;
            await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            api.sendMessage(`✅`, threadID); // إيموجي للمحمي
        } else {
            // غير محمي، أو الشرطي اختار شخصاً آخر
            killedPlayer = killerChosenPlayer;
            killedPlayer.isAlive = false;
            gameInfo.killedPlayer = killedPlayer;
            if (policeChosenPlayer) { // الشرطي كان نشطاً ولكنه اختار خطأ
                 await sendTypingMessage(api, threadID, generateStory("police_wrong_guess", gameInfo), 3000);
            } else { // الشرطي لم يكن نشطاً أو لم يختر (أو ميت)
                 await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            }
            api.sendMessage(`✅`, threadID); // إيموجي للمقتول
            api.sendMessage(`💀 لقد مات **${killedPlayer.name}** (رقم ${killedPlayer.playerNumber}) ولم يعد بإمكانه المشاركة.`, threadID);
            api.sendMessage(`أيها ${killedPlayer.role} (رقم ${killedPlayer.playerNumber})، لقد تم قتلك. لم تعد مشاركاً في اللعبة.`, killedPlayer.userID)
                .catch(e => console.error(`خطأ في إرسال رسالة الموت إلى ${killedPlayer.name}:`, e));
        }
    } else { // القاتل لم يختر هدفاً صالحاً أو لم يختر أحداً
        await sendTypingMessage(api, threadID, generateStory("day_outcome"), 3000); // قصة عدم موت أحد
        api.sendMessage(`✅`, threadID); // إيموجي لعدم الموت
        api.sendMessage("لم يقتل أحد هذه الليلة! يبدو أن القاتل كان نائمًا أو لم يتمكن من اختيار ضحيته.", threadID);
    }

    game.killerChoice = null;
    game.policeChoice = null;
    saveGameData();

    // التحقق من شروط نهاية اللعبة بعد نتائج الليل
    checkGameEnd(api, threadID);
    if (gameData[threadID] && gameData[threadID].status !== "game_over") { // فقط اطلب التصويت إذا كانت اللعبة لا تزال نشطة
        api.sendMessage(`أيها المسؤول، قل 'ابدا تصويت' لبدء مرحلة التصويت.`, threadID);
    }
}


async function promptVoting(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    if (alivePlayers.length <= 1) {
        return checkGameEnd(api, threadID); // عدد اللاعبين غير كافٍ للتصويت، تحقق من نهاية اللعبة.
    }

    let playerList = "الرجاء من الجميع التصويت على القاتل المشتبه به!\n";
    playerList += "ردوا على هذه الرسالة برقم الشخص الذي تشكون به:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
        p.votes = 0; // إعادة تعيين الأصوات لجولة جديدة
    });

    game.currentAction = {
        type: "voting",
        promptMessageID: null,
        threadID: threadID,
        voteEndTime: Date.now() + gameConfig.votingTime,
        votedUsers: []
    };
    saveGameData();

    // إرسال طلبات التصويت الخاصة
    for (const player of alivePlayers) {
        api.sendMessage(playerList, player.userID, (err, info) => {
            if (!err && info) {
                // تخزين معرف الرسالة لطلب التصويت الخاص بكل لاعب
                if (!game.currentAction.promptMessageID_private) {
                    game.currentAction.promptMessageID_private = {};
                }
                game.currentAction.promptMessageID_private[player.userID] = info.messageID;
                saveGameData();
            } else {
                console.error(`خطأ في إرسال طلب التصويت إلى ${player.name}:`, err);
            }
        });
    }

    api.sendMessage(`بدأ التصويت على القاتل! لديكم ${gameConfig.votingTime / 1000} ثانية للتصويت سرياً عبر الخاص.`, threadID);

    // تعيين مهلة لمعالجة الأصوات
    setTimeout(() => processVotingOutcome(api, threadID), gameConfig.votingTime + 2000); // إضافة مؤقت صغير
}

async function processVotingOutcome(api, threadID) {
    const game = gameData[threadID];
    if (!game || game.status !== "voting_active") return; // التأكد من أن التصويت نشط

    let maxVotes = 0;
    let suspectedPlayers = [];
    let voteCounts = {}; // لتخزين العدد الفعلي للأصوات للعرض

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);

    // جمع عدد الأصوات
    alivePlayers.forEach(p => {
        voteCounts[p.playerNumber] = p.votes;
        if (p.votes > maxVotes) {
            maxVotes = p.votes;
            suspectedPlayers = [p];
        } else if (p.votes === maxVotes && p.votes > 0) {
            suspectedPlayers.push(p);
        }
    });

    game.currentAction = null; // مسح إجراء التصويت
    saveGameData();

    if (maxVotes === 0) {
        api.sendMessage("لم يصوت أحد هذه الجولة أو لم يتم جمع أصوات كافية! القاتل ينجو ليلة أخرى...", threadID);
        game.status = "night_killer_phase"; // لا توجد أصوات، القاتل يحصل على دور آخر
        saveGameData();
        return promptKiller(api, threadID);
    }

    // فرز اللاعبين حسب عدد الأصوات للعرض
    const sortedVoteDisplay = alivePlayers.sort((a, b) => b.votes - a.votes)
                                         .map(p => `${p.name} (رقم ${p.playerNumber}): ${p.votes} صوتًا`)
                                         .join("\n");

    api.sendMessage(`نتائج التصويت:\n${sortedVoteDisplay}`, threadID);

    setTimeout(async () => {
        if (suspectedPlayers.length > 1) {
            api.sendMessage(`تعادل في الأصوات! لا يوجد إعدام هذه الليلة.`, threadID);
            game.status = "night_killer_phase"; // تعادل، القاتل يحصل على دور آخر
            saveGameData();
            return promptKiller(api, threadID);
        }

        const accusedPlayer = suspectedPlayers[0];
        api.sendMessage(`بعد فرز الأصوات، تم اتهام **${accusedPlayer.name}** (رقم ${accusedPlayer.playerNumber}) بأغلبية الأصوات!`, threadID);

        setTimeout(async () => {
            if (accusedPlayer.role === "قاتل") {
                api.sendMessage(`🎉 مبروك! لقد كان **${accusedPlayer.name}** هو القاتل! لقد تم كشفه وتمت إدانته!`, threadID);
                api.sendMessage(`**انتهت اللعبة!** لقد فاز القرويون!`, threadID);
                delete gameData[threadID]; // إنهاء اللعبة
            } else if (accusedPlayer.role === "شرطي") {
                api.sendMessage(`💔 للأسف، لقد تم تصويت القرويين على قتل **شرطيهم** الذي يحميكم، **${accusedPlayer.name}**! لقد أعدمتم شخصًا بريئًا ومفيدًا!`, threadID);
                accusedPlayer.isAlive = false;
                api.sendMessage(`أيها ${accusedPlayer.role} (رقم ${accusedPlayer.playerNumber})، لقد تم إعدامك ظلماً. لم تعد مشاركاً في اللعبة.`, accusedPlayer.userID)
                    .catch(e => console.error(`خطأ في إرسال رسالة الموت إلى ${accusedPlayer.name}:`, e));
                saveGameData();
                checkGameEnd(api, threadID);
                if (gameData[threadID] && gameData[threadID].status !== "game_over") {
                    game.status = "night_killer_phase";
                    api.sendMessage(`ليل جديد يحل على القرية... القاتل يختار ضحيته.`, threadID);
                    promptKiller(api, threadID);
                }
            } else { // المتهم هو قروي
                api.sendMessage(`💔 للأسف، **${accusedPlayer.name}** لم يكن القاتل. لقد أعدمتم شخصًا قروياً عادياً وبسيطاً!`, threadID);
                accusedPlayer.isAlive = false;
                api.sendMessage(`أيها ${accusedPlayer.role} (رقم ${accusedPlayer.playerNumber})، لقد تم إعدامك ظلماً. لم تعد مشاركاً في اللعبة.`, accusedPlayer.userID)
                    .catch(e => console.error(`خطأ في إرسال رسالة الموت إلى ${accusedPlayer.name}:`, e));
                saveGameData();
                checkGameEnd(api, threadID);
                if (gameData[threadID] && gameData[threadID].status !== "game_over") {
                    game.status = "night_killer_phase";
                    api.sendMessage(`ليل جديد يحل على القرية... القاتل يختار ضحيته.`, threadID);
                    promptKiller(api, threadID);
                }
            }
            saveGameData();
        }, 3000);
    }, 3000);
}

function checkGameEnd(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    const aliveKillers = alivePlayers.filter(p => p.role === "قاتل");
    const aliveCivilians = alivePlayers.filter(p => p.role !== "قاتل"); // هذا يشمل الآن الشرطي كجزء من جانب المدنيين

    if (aliveKillers.length === 0) {
        api.sendMessage("🎉 مبروك! تم القضاء على القاتل. **لقد فاز القرويون!**", threadID);
        delete gameData[threadID];
        game.status = "game_over"; // تعيين الحالة لمنع المزيد من الإجراءات
    } else if (aliveKillers.length >= aliveCivilians.length) { // يفوز القاتل إذا كان عدد القتلة أكبر من أو يساوي عدد المدنيين
        api.sendMessage("💔 يا للأسف! عدد القتلة أصبح مساوياً أو أكثر من عدد القرويين. **لقد فاز القاتل!**", threadID);
        delete gameData[threadID];
        game.status = "game_over";
    }
    saveGameData();
}

// --- تصدير الوحدة النمطية ---

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, senderID, body, isGroup, messageReply } = event;

    // التحقق مما إذا كانت اللعبة نشطة في هذه المحادثة
    const game = gameData[threadID];

    // --- الانضمام إلى اللعبة ---
    if (body && (body.toLowerCase() === "تم" || body.toLowerCase() === "نعم") &&
        game && game.status === "joining" &&
        messageReply && messageReply.messageID === game.joinMessageID) {

        if (Object.keys(game.players).length >= gameConfig.maxPlayers) {
            return api.sendMessage("عذراً، لقد اكتمل العدد الأقصى للمشاركين في اللعبة.", threadID, messageID);
        }

        if (game.players[senderID]) {
            return api.sendMessage("لقد انضممت بالفعل إلى اللعبة!", threadID, messageID);
        }

        api.getUserInfo(senderID, (err, info) => {
            if (err) return console.error("خطأ في الحصول على معلومات المستخدم:", err);
            const userName = info[senderID].name;
            game.players[senderID] = { userID: senderID, name: userName };
            saveGameData();
            api.sendMessage(`لقد انضم **${userName}** إلى اللعبة! العدد الحالي: ${Object.keys(game.players).length}`, threadID);
            api.sendMessage(`الرجاء قم بتفقد طلبات المراسلة (أو رسائل السباام) لتلقي دورك سرياً عندما تبدأ اللعبة.`, senderID)
                .catch(e => console.error("خطأ في إرسال تأكيد الرسالة الخاصة:", e));
        });
        return;
    }

    // --- الإجراءات في الرسائل الخاصة (اختيارات القاتل/الشرطي والتصويت) ---
    if (!isGroup) { // هذا الحدث هو رسالة خاصة من لاعب
        // البحث عن اللعبة التي تنتمي إليها هذه الرسالة الخاصة (إن وجدت)
        const activeGameThreadID = Object.keys(gameData).find(tid =>
            gameData[tid] && gameData[tid].players[senderID] &&
            gameData[tid].currentAction && gameData[tid].currentAction.threadID === tid && // التأكد من أنها لهذه اللعبة المحددة
            ((gameData[tid].currentAction.promptMessageID && gameData[tid].currentAction.promptMessageID === messageReply?.messageID) ||
             (gameData[tid].currentAction.promptMessageID_private && gameData[tid].currentAction.promptMessageID_private[senderID] === messageReply?.messageID))
        );

        if (activeGameThreadID) {
            const gameInQuestion = gameData[activeGameThreadID];
            const player = gameInQuestion.players[senderID];
            const chosenNumber = parseInt(body);

            if (isNaN(chosenNumber)) {
                return api.sendMessage("الرجاء الرد برقم صالح.", senderID);
            }

            const targetPlayer = Object.values(gameInQuestion.players).find(p => p.playerNumber === chosenNumber && p.isAlive);

            if (!targetPlayer) {
                return api.sendMessage("الرقم الذي اخترته غير صحيح أو اللاعب ميت. الرجاء اختيار رقم لاعب حي.", senderID);
            }

            // اختيار القاتل
            if (gameInQuestion.currentAction.type === "killer_choice" && player.role === "قاتل" && player.isAlive) {
                if (targetPlayer.userID === player.userID) {
                    return api.sendMessage("لا يمكنك قتل نفسك!", senderID);
                }
                gameInQuestion.killerChoice = chosenNumber;
                api.sendMessage(`تم اختيارك للضحية رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                // بعد أن يختار القاتل، قم فوراً بطلب الشرطي إذا كان حياً، وإلا قم بمعالجة النتائج
                if (gameInQuestion.police && gameInQuestion.police.isAlive) {
                    gameInQuestion.status = "night_police_phase";
                    saveGameData();
                    api.sendMessage(`القاتل اختار ضحيته... الآن دور الشرطي ليحمي أحدهم.`, activeGameThreadID);
                    promptPolice(api, activeGameThreadID);
                } else {
                    gameInQuestion.status = "night_outcome_processing";
                    saveGameData();
                    api.sendMessage(`القاتل اختار ضحيته... لا يوجد شرطي لحماية أحد. نترقب نتائج هذه الليلة.`, activeGameThreadID);
                    setTimeout(() => processNightOutcome(api, activeGameThreadID), 3000);
                }
                gameInQuestion.currentAction = null; // مسح الإجراء بعد المعالجة
                saveGameData();
                return;
            }

            // اختيار الشرطي
            if (gameInQuestion.currentAction.type === "police_choice" && player.role === "شرطي" && player.isAlive) {
                gameInQuestion.policeChoice = chosenNumber;
                api.sendMessage(`تم اختيارك لحماية الشخص رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                gameInQuestion.status = "night_outcome_processing";
                gameInQuestion.currentAction = null; // مسح الإجراء بعد المعالجة
                saveGameData();
                api.sendMessage(`الشرطي قام بواجبه... نترقب نتائج هذه الليلة.`, activeGameThreadID);
                setTimeout(() => processNightOutcome(api, activeGameThreadID), 3000);
                return;
            }

            // التصويت
            if (gameInQuestion.currentAction.type === "voting" && player.isAlive) {
                if (gameInQuestion.currentAction.votedUsers.includes(senderID)) {
                    return api.sendMessage("لقد قمت بالتصويت بالفعل في هذه الجولة.", senderID);
                }
                targetPlayer.votes = (targetPlayer.votes || 0) + 1;
                gameInQuestion.currentAction.votedUsers.push(senderID);
                api.sendMessage(`تم التصويت على ${targetPlayer.name} (رقم ${targetPlayer.playerNumber}).`, senderID);
                saveGameData();
                return;
            }

            // Fallback للإجراءات الخاصة غير المصرح بها/غير الصالحة
            api.sendMessage("ليس دورك الآن أو أنك لست مخولاً بالقيام بهذا الإجراء.", senderID);
        }
        return;
    }

    // --- أوامر الدردشة الجماعية ---
    if (isGroup) {
        // أمر 'women' الأصلي، إذا كنت ترغب في الاحتفاظ به
        if (body && (body.toLowerCase().includes("women") || body.includes("☕"))) {
            const msg = {
                body: "hahaha Women 🤣",
                attachment: fs.createReadStream(__dirname + `/noprefix/wn.mp4`) // تأكد من صحة هذا المسار
            };
            api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("☕", event.messageID, (err) => {}, true);
            return;
        }
    }
};


module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0] ? args[0].toLowerCase() : "";

    // --- أوامر المسؤول فقط ---
    const isAdmin = senderID === gameConfig.adminID;

    // الأمر: المشاركين (بدء اللعبة)
    if (command === "المشاركين" && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status !== "game_over") {
            return api.sendMessage("يوجد بالفعل لعبة قيد التشغيل أو في انتظار الانضمام في هذه المجموعة. الرجاء الانتظار أو إلغاء اللعبة الحالية.", threadID);
        }

        gameData[threadID] = {
            status: "joining", // 'joining', 'roles_assigned', 'night_killer_phase', إلخ.
            players: {}, // { userID: { name, role, playerNumber, isAlive, votes } }
            joinMessageID: null, // لتتبع الرسالة التي يرد عليها اللاعبون للانضمام
            killer: null,
            police: null,
            killerChoice: null,
            policeChoice: null,
            currentAction: null, // { type: 'killer_choice' | 'police_choice' | 'voting', promptMessageID, threadID, voteEndTime }
        };
        saveGameData();

        const joinMessage = `
            اللعبة ستبدأ قريباً!
            الرجاء من المشاركين الرد على هذه الرسالة بـ "**تم**" أو "**نعم**" للانضمام.
            العدد المطلوب: **${gameConfig.minPlayers}** لاعبين على الأقل، والحد الأقصى **${gameConfig.maxPlayers}** لاعبين.
        `;
        api.sendMessage(joinMessage, threadID, (err, info) => {
            if (!err && info) {
                gameData[threadID].joinMessageID = info.messageID;
                saveGameData();
            }
        });
        return;
    }

    // الأمر: ابدا (المسؤول يبدأ توزيع الأدوار)
    if (command === "ابدا" && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status === "joining") {
            startGamePhase1(api, threadID); // هذه الوظيفة هي التي ترسل الأدوار الخاصة
        } else {
            api.sendMessage("اللعبة ليست في مرحلة الانضمام لبدء توزيع الأدوار. تأكد من أنك قلت 'المشاركين' أولاً.", threadID);
        }
        return;
    }

    // الأمر: ابدا اللعبة (المسؤول يبدأ قصة اللعبة/مرحلة الليل)
    if ((command === "ابدا_اللعبة" || event.body === "ابدا اللعبة") && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status === "roles_assigned") {
            startGamePhase2(api, threadID);
        } else if (gameData[threadID] && gameData[threadID].status === "night_killer_phase") {
             api.sendMessage("اللعبة بدأت بالفعل، القاتل يختار ضحيته.", threadID);
        }
        else if (gameData[threadID] && (gameData[threadID].status === "day_voting_phase" || gameData[threadID].status === "night_outcome_processing" || gameData[threadID].status === "night_police_phase")) {
            // هذا يعني دورة يوم/ليل جديدة
            gameData[threadID].status = "night_killer_phase"; // إعادة تعيين إلى مرحلة القاتل لدورة جديدة
            saveGameData();
            api.sendMessage("ليل جديد يحل على القرية... القاتل يختار ضحيته.", threadID);
            promptKiller(api, threadID);
        }
        else {
            api.sendMessage("لا توجد لعبة في مرحلة جاهزة للبدء أو الأدوار لم توزع بعد. تأكد من أنك قلت 'المشاركين' ثم 'ابدا' أولاً.", threadID);
        }
        return;
    }

    // الأمر: ابدا تصويت (المسؤول يبدأ مرحلة التصويت)
    if ((command === "ابدا_تصويت" || event.body === "ابدا تصويت") && isAdmin) {
        if (gameData[threadID] && (gameData[threadID].status === "night_outcome_processing" || gameData[threadID].status === "night_killer_phase" || gameData[threadID].status === "night_police_phase" || gameData[threadID].status === "roles_assigned")) {
            if (gameData[threadID].status === "night_outcome_processing") {
                 api.sendMessage("انتظر حتى تكتمل أحداث الليلة قبل بدء التصويت.", threadID);
                 return;
            }
            gameData[threadID].status = "voting_active"; // تعيين الحالة إلى التصويت النشط
            saveGameData();
            promptVoting(api, threadID);
        } else {
            api.sendMessage("لا يمكنك بدء التصويت الآن. تأكد من أن اللعبة في المرحلة الصحيحة.", threadID);
        }
        return;
    }

    // الأمر: إلغاء اللعبة (المسؤول يلغي اللعبة)
    if ((command === "إلغاء_اللعبة" || event.body === "إلغاء اللعبة") && isAdmin) {
        if (gameData[threadID]) {
            delete gameData[threadID];
            saveGameData();
            api.sendMessage("تم إلغاء اللعبة بنجاح.", threadID);
        } else {
            api.sendMessage("لا توجد لعبة قيد التشغيل في هذه المجموعة لإلغائها.", threadID);
        }
        return;
    }

    // محاولات غير المسؤولين لاستخدام أوامر المسؤول
    if (!isAdmin && (command === "المشاركين" || command === "ابدا" || command === "ابدا_اللعبة" || event.body === "ابدا اللعبة" || command === "ابدا_تصويت" || event.body === "ابدا تصويت" || command === "إلغاء_اللعبة" || event.body === "إلغاء اللعبة")) {
        api.sendMessage("أنت لست المسؤول عن هذه اللعبة.", threadID, messageID);
    }
};
