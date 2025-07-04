const fs = require("fs");

// Constants
const AUTHORIZED_USER_ID = "100015903097543"; // قم بتغيير هذا إلى معرّف المستخدم المطور الخاص بك
const MIN_PLAYERS_DEFAULT = 2; // الحد الأدنى الافتراضي لعدد اللاعبين إذا لم يحدد المطور
const GAME_STAGES = [
    { name: "القلعة المهجورة", outcomes: [
        { type: "death", message: "أثناء عبورك للقلعة المهجورة، سقطت في بئر عميق ولم تستطع النجاة! 💀", reason: "سقط في بئر" },
        { type: "death", message: "لسوء الحظ، لدغتك أفعى سامة في القلعة وماتت على الفور! 🐍", reason: "لدغة أفعى" },
        { type: "survival", message: "تمكنت من شق طريقك عبر القلعة المهجورة بسلام! 🎉", reason: "تجاوز العقبات بحكمة" },
        { type: "survival", message: "بعد جهد كبير، وجدت مخرجًا سريًا ونجوت من القلعة! ✨", reason: "اكتشف مخرجًا سريًا" }
    ]},
    { name: "الغابة الكثيفة", outcomes: [
        { type: "death", message: "توهت في الغابة الكثيفة وأصبحت فريسة للحيوانات المفترسة! 🐺", reason: "توه في الغابة" },
        { type: "death", message: "سقطت في فخ نصبه صيادون ولم تتمكن من الخروج! 🕸️", reason: "وقع في فخ" },
        { type: "survival", message: "بمساعدة نجمة الشمال، وجدت طريقك الصحيح ونجوت من الغابة! ⭐", reason: "اهتدى بالنجوم" },
        { type: "survival", message: "قمت ببناء ملجأ صغير وانتظرت الصباح ثم أكملت طريقك بسلام! ⛺", reason: "بنى ملجأ" }
    ]},
    { name: "الجبل الثلجي", outcomes: [
        { type: "death", message: "تسببت عاصفة ثلجية مفاجئة في انزلاقك من الجبل! ❄️", reason: "عاصفة ثلجية" },
        { type: "death", message: "لم تستطع تحمل البرد القارس وتجمدت حتى الموت! 🥶", reason: "تجمد من البرد" },
        { type: "survival", message: "بقوة وعزيمة، تسلقت الجبل الثلجي ووصلت إلى القمة بسلام! 🧗", reason: "تسلّق ببراعة" },
        { type: "survival", message: "وجدت كهفًا دافئًا ومكثت فيه حتى مرت العاصفة ثم أكملت! 🏕️", reason: "وجد كهفًا دافئًا" }
    ]},
    // يمكنك إضافة المزيد من المراحل هنا
];

const GAME_ROLES = [
    "القائد",
    "المساعد",
    "العضو",
    "العضو", // يمكن تكرار الأعضاء ليتناسب مع عدد اللاعبين
    "العضو",
    "العضو"
];


// Game state for each thread
let games = {}; // Key: threadID, Value: game state object

module.exports.config = {
    name: "يورو",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "YourName", // قم بتغيير هذا إلى اسمك
    description: "لعبة المغامرات يورو: عبور المراحل وتوزيع الأدوار!",
    commandCategory: "لعبة",
    usages: "يورو [عدد_المشاركين] / يورو ابدأ / يورو انضم / يورو حالة / يورو انهاء",
    cooldowns: 5,
};

// Function to reset game state for a thread
function resetGame(threadID) {
    games[threadID] = {
        active: false,
        phase: "waiting_for_players", // waiting_for_players, playing
        requiredPlayers: 0,
        players: [], // [{ id: "user_id", name: "user_name", role: "", alive: true }]
        rolesAssigned: false,
        currentStageIndex: -1, // -1 means not started yet, 0 for first stage
        currentPlayerIndex: -1, // Index of player whose turn it is
        discussionMessageID: null, // To reply for joining/actions
    };
}

// Initialize games object
module.exports.onLoad = function() {
    // You might want to load game states from a file here if you want persistence
    // For now, it will reset on bot restart
};

module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
    const { threadID, messageID, senderID, body, type, messageReply } = event;
    const lowerCaseBody = body ? body.toLowerCase() : "";

    // If no game is active in this thread, or it's not a reply message, skip
    if (!games[threadID] || !games[threadID].active || type !== "message_reply") {
        return;
    }

    const game = games[threadID];

    // Handle replies for player joining
    if (game.phase === "waiting_for_players" && messageReply && messageReply.messageID === game.discussionMessageID) {
        if (!game.players.some(p => p.id === senderID)) {
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            game.players.push({
                id: senderID,
                name: senderName,
                role: null,
                alive: true,
            });
            api.sendMessage(`تمت مشاركة ${senderName} في اللعبة! (${game.players.length}/${game.requiredPlayers} مطلوبين)`, threadID);

            if (game.players.length === game.requiredPlayers) {
                await startGame(api, threadID, game);
            }
        } else {
            api.sendMessage("أنت بالفعل في قائمة المشاركين.", threadID, messageID);
        }
        return;
    }

    // Handle replies for player action during a stage
    if (game.phase === "playing" && game.currentPlayerIndex !== -1 && messageReply && messageReply.messageID === game.discussionMessageID) {
        const currentPlayer = game.players[game.currentPlayerIndex];

        if (senderID !== currentPlayer.id) {
            return api.sendMessage("ليس دورك حاليًا للرد.", threadID, messageID);
        }
        if (!currentPlayer.alive) {
            return api.sendMessage("أنت ميت ولا يمكنك القيام بأي فعل.", threadID, messageID);
        }

        // Check if the reply indicates action (e.g., "نعم", "اجل", "اي")
        const confirmationKeywords = ["نعم", "اجل", "اي", "yes", "ok"];
        if (confirmationKeywords.includes(lowerCaseBody)) {
            await processPlayerAction(api, threadID, game, currentPlayer);
        } else {
            api.sendMessage("الرجاء الرد بكلمة 'نعم' أو 'اجل' أو 'اي' للمتابعة.", threadID, messageID);
        }
        return;
    }
};


module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    // Only the authorized user can start/end games or set player count
    if (senderID !== AUTHORIZED_USER_ID) {
        return api.sendMessage("عذرًا، لا يمكنك استخدام هذا الأمر. أنت لست مطور البوت.", threadID, messageID);
    }

    const command = args[0] ? args[0].toLowerCase() : "";
    const value = parseInt(args[0]); // For "يورو [عدد_المشاركين]"

    // Initialize game state if it doesn't exist for this thread
    if (!games[threadID]) {
        resetGame(threadID);
    }
    let game = games[threadID];

    // Command: يورو [عدد] (Set required players)
    if (!isNaN(value) && value > 0) {
        if (game.active) {
            return api.sendMessage("اللعبة جارية بالفعل. لا يمكن تغيير عدد المشاركين الآن.", threadID, messageID);
        }
        if (value < MIN_PLAYERS_DEFAULT) {
            return api.sendMessage(`يجب أن يكون عدد المشاركين ${MIN_PLAYERS_DEFAULT} على الأقل.`, threadID, messageID);
        }
        resetGame(threadID); // Ensure a clean slate before setting new requirement
        game = games[threadID]; // Re-get the reference
        game.requiredPlayers = value;
        game.active = true;
        game.phase = "waiting_for_players";
        api.sendMessage(`تم تحديد عدد المشاركين المطلوب: ${value}. الرجاء من المشاركين الرد على هذه الرسالة للانضمام.`, threadID, (err, info) => {
            if (!err) {
                game.discussionMessageID = info.messageID;
            }
        });
        return;
    }

    // Other commands
    switch (command) {
        case "ابدأ":
        case "start":
            if (!game.active || game.requiredPlayers === 0) {
                return api.sendMessage("الرجاء تحديد عدد المشاركين أولاً باستخدام: يورو [عدد_المشاركين] ثم ابدأ اللعبة.", threadID, messageID);
            }
            if (game.players.length < game.requiredPlayers) {
                return api.sendMessage(`لم يكتمل عدد المشاركين المطلوب (${game.players.length}/${game.requiredPlayers}). الرجاء انتظار اكتمال العدد.`, threadID, messageID);
            }
            if (game.phase === "playing") {
                return api.sendMessage("اللعبة جارية بالفعل.", threadID, messageID);
            }
            // If already enough players and not playing, start the game
            await startGame(api, threadID, game);
            break;

        case "انضم": // This command is less critical now as joining is via reply
        case "join":
            if (!game.active || game.phase !== "waiting_for_players") {
                return api.sendMessage("لا توجد لعبة قيد الانتظار حاليًا يمكنك الانضمام إليها أو تم تحديد عدد المشاركين بالفعل.", threadID, messageID);
            }
            if (game.players.some(p => p.id === senderID)) {
                return api.sendMessage("أنت بالفعل في قائمة المشاركين.", threadID, messageID);
            }
            if (game.players.length >= game.requiredPlayers) {
                return api.sendMessage("اكتمل عدد المشاركين بالفعل.", threadID, messageID);
            }
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            game.players.push({
                id: senderID,
                name: senderName,
                role: null,
                alive: true,
            });
            api.sendMessage(`تمت مشاركة ${senderName} في اللعبة! (${game.players.length}/${game.requiredPlayers} مطلوبين)`, threadID, messageID);

            if (game.players.length === game.requiredPlayers) {
                await startGame(api, threadID, game);
            }
            break;

        case "حالة":
        case "status":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية في هذه المجموعة.", threadID, messageID);
            }
            let statusMsg = "حالة لعبة يورو:\n";
            statusMsg += `المرحلة الحالية: ${game.phase === "waiting_for_players" ? "انتظار المشاركين" : "اللعب"}\n`;
            statusMsg += `المطلوب: ${game.requiredPlayers} مشارك، الحالي: ${game.players.length}\n`;
            statusMsg += "المشاركون الأحياء:\n";
            game.players.filter(p => p.alive).forEach((p, index) => {
                statusMsg += `- ${index + 1}. ${p.name} (الدور: ${p.role || 'لم يُحدد بعد'})\n`;
            });
            if (game.rolesAssigned) {
                statusMsg += "\nالأدوار المعينة:\n";
                game.players.forEach(p => {
                    statusMsg += `- ${p.name}: ${p.role} (${p.alive ? "حي" : "ميت"})\n`;
                });
            }
            if (game.currentStageIndex !== -1) {
                statusMsg += `\nالمرحلة الحالية: ${GAME_STAGES[game.currentStageIndex].name}\n`;
            }
            if (game.currentPlayerIndex !== -1) {
                statusMsg += `دور ${game.players[game.currentPlayerIndex].name} للعب!\n`;
            }
            api.sendMessage(statusMsg, threadID, messageID);
            break;

        case "انهاء":
        case "end":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية لإنهاءها.", threadID, messageID);
            }
            api.sendMessage("تم إنهاء لعبة يورو.", threadID, messageID);
            resetGame(threadID);
            break;

        default:
            api.sendMessage("أمر غير صالح. الاستخدام: يورو [عدد_المشاركين] لبدء جديد، أو يورو ابدأ/انضم/حالة/انهاء.", threadID, messageID);
            break;
    }
};

// --- Game Logic Functions ---

async function startGame(api, threadID, game) {
    game.phase = "playing";
    game.rolesAssigned = true;
    game.currentStageIndex = 0; // Start with the first stage
    game.currentPlayerIndex = 0; // First player's turn

    assignRoles(game.players);

    let introMessage = "اكتمل عدد المشاركين! فلتبدأ مغامرة يورو!\n";
    introMessage += "تم تحديد الأدوار بنجاح:\n";
    game.players.forEach((p, index) => {
        introMessage += `${index + 1}. ${p.name}: ${p.role}\n`;
    });
    await api.sendMessage(introMessage, threadID);

    // Wait 5 seconds before starting the first player's turn
    setTimeout(async () => {
        await startPlayerTurn(api, threadID, game);
    }, 5000);
}

function assignRoles(players) {
    const rolesPool = [...GAME_ROLES]; // Copy the roles array

    // Ensure enough roles for players, duplicate 'العضو' if needed
    while (rolesPool.length < players.length) {
        rolesPool.push("العضو");
    }
    // Trim roles if too many
    while (rolesPool.length > players.length) {
        rolesPool.pop();
    }

    // Shuffle roles
    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    players.forEach((player, index) => {
        player.role = rolesPool[index];
    });
}

async function startPlayerTurn(api, threadID, game) {
    // Check if game ended (all players dead or game finished)
    const alivePlayers = game.players.filter(p => p.alive);
    if (alivePlayers.length === 0) {
        api.sendMessage("يا للأسف! مات جميع المشاركين. انتهت اللعبة.", threadID);
        resetGame(threadID);
        return;
    }

    // Find the next alive player
    let nextPlayer = null;
    let originalIndex = game.currentPlayerIndex;
    do {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        nextPlayer = game.players[game.currentPlayerIndex];
        if (game.currentPlayerIndex === originalIndex && !nextPlayer.alive) {
            // All players dead, or only dead players left in loop
            api.sendMessage("لا يوجد المزيد من اللاعبين الأحياء للمتابعة. انتهت اللعبة.", threadID);
            resetGame(threadID);
            return;
        }
    } while (!nextPlayer.alive);

    const currentPlayer = nextPlayer;
    const currentStage = GAME_STAGES[game.currentStageIndex];

    const turnMessage = `\n--- دور ${currentPlayer.name} في ${currentStage.name} ---`;
    const actionPrompt = `يا ${currentPlayer.name} (${currentPlayer.role})، هل تريد العبور عبر ${currentStage.name}؟ الرجاء الرد على هذه الرسالة بـ "نعم" أو "اجل" أو "اي" للمتابعة.`;

    await api.sendMessage({
        body: turnMessage + "\n" + actionPrompt
    }, threadID, (err, info) => {
        if (!err) {
            game.discussionMessageID = info.messageID;
        }
    });
}

async function processPlayerAction(api, threadID, game, player) {
    const currentStage = GAME_STAGES[game.currentStageIndex];
    const outcomes = currentStage.outcomes;

    // Randomly select an outcome
    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    if (randomOutcome.type === "death") {
        player.alive = false;
        await api.sendMessage(`يا للأسف ${player.name} (${player.role})!\n${randomOutcome.message}\nسبب الموت: ${randomOutcome.reason}`, threadID);
    } else { // survival
        await api.sendMessage(`تهانينا ${player.name} (${player.role})!\n${randomOutcome.message}\nسبب النجاة: ${randomOutcome.reason}`, threadID);
    }

    // Check if current stage is the last one
    if (game.currentStageIndex === GAME_STAGES.length - 1) {
        // If this player survived the last stage, they win the game!
        if (player.alive) {
            await api.sendMessage(`تهانينا لـ ${player.name} على إكمال جميع المراحل والوصول إلى النهاية بسلام! أنت الفائز في مغامرة يورو! 🏆`, threadID);
        }
        // Check if there are other alive players
        const remainingAlivePlayers = game.players.filter(p => p.alive);
        if (remainingAlivePlayers.length === 0) {
            api.sendMessage("انتهت اللعبة! لم ينجُ أي لاعب.", threadID);
            resetGame(threadID);
        } else if (game.currentPlayerIndex === game.players.length - 1) { // If last player played last stage
             api.sendMessage("انتهت جميع المراحل. فلنرى من نجا!", threadID);
             let finalSurvivors = "اللاعبون الذين نجوا:\n";
             remainingAlivePlayers.forEach(p => finalSurvivors += `- ${p.name} (${p.role})\n`);
             api.sendMessage(finalSurvivors, threadID);
             resetGame(threadID);
        } else {
            // Move to next player in the last stage or next stage if available
            await nextPlayerOrStage(api, threadID, game);
        }
    } else {
        // Move to next stage for the same player if they survived, or next player if they died
        await nextPlayerOrStage(api, threadID, game);
    }
}

async function nextPlayerOrStage(api, threadID, game) {
    // Determine if all players have completed the current stage
    const allPlayersCompletedCurrentStage = game.players.every(p => p.currentStage === game.currentStageIndex + 1 || !p.alive);

    if (allPlayersCompletedCurrentStage) {
        game.currentStageIndex++; // Move to next stage
        if (game.currentStageIndex < GAME_STAGES.length) {
            // Reset current player index for the new stage to the first alive player
            game.currentPlayerIndex = -1; // Will be set by startPlayerTurn
            await api.sendMessage(`\n--- ننتقل الآن إلى المرحلة الجديدة: ${GAME_STAGES[game.currentStageIndex].name} ---`, threadID);
            setTimeout(async () => {
                await startPlayerTurn(api, threadID, game);
            }, 5000);
        } else {
            // All stages completed
            const finalSurvivors = game.players.filter(p => p.alive);
            if (finalSurvivors.length > 0) {
                let msg = "تهانينا! لقد أكملت جميع المراحل. الناجون هم:\n";
                finalSurvivors.forEach(p => msg += `- ${p.name} (${p.role})\n`);
                api.sendMessage(msg, threadID);
            } else {
                api.sendMessage("انتهت اللعبة! لم ينجُ أي لاعب عبر جميع المراحل.", threadID);
            }
            resetGame(threadID);
        }
    } else {
        // Continue with the next player in the current stage
        setTimeout(async () => {
            await startPlayerTurn(api, threadID, game);
        }, 5000);
    }
}
