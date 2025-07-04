const fs = require("fs");

// --- Game State Management ---
// We'll store game data in a file to persist it.
// This will contain active games, players, roles, etc.
let gameData = {};
const GAME_DATA_FILE = __dirname + "/gameData.json";

function loadGameData() {
    try {
        gameData = JSON.parse(fs.readFileSync(GAME_DATA_FILE, "utf8"));
    } catch (e) {
        gameData = {}; // Initialize if file doesn't exist or is invalid
    }
}

function saveGameData() {
    fs.writeFileSync(GAME_DATA_FILE, JSON.stringify(gameData, null, 2), "utf8");
}

loadGameData(); // Load data when the bot starts

// --- Game Configuration ---
const gameConfig = {
    minPlayers: 4, // Minimum players required to start a game
    roles: [
        { name: "قاتل", count: 1 }, // Killer
        { name: "شرطي", count: 1 }, // Police
        { name: "قروي", count: -1 }, // Villager (assign remaining)
        { name: "مزارع", count: -1 }, // Farmer
        { name: "طباخ", count: -1 }, // Cook
        { name: "عامل بناء", count: -1 } // Builder
    ],
    // Add more configurations like turn duration, story snippets etc.
};

module.exports.config = {
    name: "werewolf_game", // Changed name for clarity
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Your Name", // Change this to your name
    description: "A custom Werewolf-like game.",
    commandCategory: "Game",
    usages: "المشاركة | إلغاء اللعبة | بداية اللعبة", // Updated usages
    cooldowns: 5,
};

// --- Helper Functions ---

/**
 * Assigns random roles to players.
 * @param {Array} players - Array of player objects {userID, name}.
 * @returns {Array} - Players with assigned roles and numbers.
 */
function assignRoles(players) {
    let availableRoles = [];
    let villagerRoles = [];

    // Prepare roles based on config
    gameConfig.roles.forEach(role => {
        if (role.count > 0) {
            for (let i = 0; i < role.count; i++) {
                availableRoles.push(role.name);
            }
        } else if (role.count === -1) { // These are the 'villager' types
            villagerRoles.push(role.name);
        }
    });

    // Shuffle available fixed roles
    for (let i = availableRoles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
    }

    // Assign roles
    let assignedPlayers = players.map((player, index) => {
        let role;
        if (availableRoles.length > 0) {
            role = availableRoles.pop();
        } else {
            // Assign remaining players random villager-like roles
            role = villagerRoles[Math.floor(Math.random() * villagerRoles.length)];
        }
        return {
            userID: player.userID,
            name: player.name,
            role: role,
            playerNumber: index + 1,
            isAlive: true,
            votes: 0 // For voting phase
        };
    });

    return assignedPlayers;
}

/**
 * Generates a short story for the beginning of the game or a new day.
 * @param {string} type - 'start' or 'day'.
 * @param {object} gameInfo - Current game state information (e.g., killed player, protected player).
 * @returns {string} - The story text.
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
        const { killedPlayer, protectedPlayer, killerChosen, policeChosen } = gameInfo;

        if (killedPlayer && (!protectedPlayer || killerChosen !== policeChosen)) {
            story = `
                في صباح يوم جديد من ${randomDay}، وعند الفجر،
                استيقظت القرية على صرخات مفزعة!
                تم العثور على جثة ${killedPlayer.name} (رقم ${killedPlayer.playerNumber}) ملقاة...
                لقد مات ${killedPlayer.name} بشكل مأساوي على يد القاتل!
                فليرقد بسلام.
            `;
        } else if (killedPlayer && protectedPlayer && killerChosen === policeChosen) {
            story = `
                في صباح يوم ${randomDay}، وبينما كان القاتل يتربص بضحية جديدة،
                تدخل البطل الخفي! لقد تمكن الشرطي السري من حماية ${killedPlayer.name} (رقم ${killedPlayer.playerNumber}) في اللحظة الأخيرة.
                نجا ${killedPlayer.name} بأعجوبة من الموت المحقق!
                القرية تتنفس الصعداء، ولكن الخطر ما زال قائماً.
            `;
        } else if (!killedPlayer && !protectedPlayer) {
             story = `
                في صباح يوم ${randomDay}، يبدو أن القرية قد نجت من ليلة هادئة.
                لم يقع أي ضحايا هذه الليلة...
                هل اختبأ القاتل أم كان حظ القرية جيدًا؟
             `;
        }
    } else if (type === "police_wrong_guess") {
         story = `
            في صباح يوم ${randomDay}، وبينما كان القاتل يخطط لضحيته،
            قام الشرطي بحماية شخص آخر، للأسف لم يتمكن من منع الجريمة.
            القاتل ترك ${gameInfo.killedPlayer.name} (رقم ${gameInfo.killedPlayer.playerNumber}) جثة هامدة!
            الحماية لم تكن في المكان الصحيح هذه المرة.
         `;
    }

    return story.trim();
}

/**
 * Sends a typing indicator and then the message.
 * @param {object} api - The API object.
 * @param {string} threadID - The thread ID.
 * @param {string} message - The message to send.
 * @param {number} delayMs - Delay in milliseconds before sending the message.
 */
function sendTypingMessage(api, threadID, message, delayMs = 2000) {
    return new Promise(resolve => {
        api.sendTypingIndicator(threadID, () => {
            setTimeout(() => {
                api.sendMessage(message, threadID, (err, info) => {
                    if (err) console.error("Error sending message:", err);
                    resolve(info);
                });
            }, delayMs);
        });
    });
}

// --- Main Game Logic Functions ---

async function startGame(api, threadID) {
    if (!gameData[threadID] || gameData[threadID].status !== "joining") {
        return api.sendMessage("لا توجد لعبة قيد الانتظار للبدء في هذه المجموعة.", threadID);
    }

    const currentPlayers = Object.values(gameData[threadID].players);

    if (currentPlayers.length < gameConfig.minPlayers) {
        return api.sendMessage(`عذراً، نحتاج إلى ${gameConfig.minPlayers} لاعبين على الأقل لبدء اللعبة. العدد الحالي هو ${currentPlayers.length}.`, threadID);
    }

    api.sendMessage(`تم توزيع الأدوار للمشاركين! ستبدأ اللعبة بعد 15 ثانية... استعدوا!`, threadID);

    gameData[threadID].status = "starting";
    saveGameData();

    setTimeout(async () => {
        const assignedPlayers = assignRoles(currentPlayers);
        gameData[threadID].players = {}; // Reset players object
        assignedPlayers.forEach(p => {
            gameData[threadID].players[p.userID] = p;
        });
        gameData[threadID].killer = assignedPlayers.find(p => p.role === "قاتل");
        gameData[threadID].police = assignedPlayers.find(p => p.role === "شرطي");
        gameData[threadID].status = "night_killer_phase"; // First phase: Killer chooses

        saveGameData();

        // Inform players privately about their roles
        for (const player of assignedPlayers) {
            await api.sendMessage(
                `مرحباً ${player.name}!\nشخصيتك في اللعبة هي: **${player.role}**.\nرقمك في اللعبة هو: **${player.playerNumber}**.`,
                player.userID
            );
        }

        // Start the game story
        await sendTypingMessage(api, threadID, generateStory("start"), 3000);

        // Prompt Killer to choose victim
        await promptKiller(api, threadID);

        saveGameData();

    }, 15000);
}

async function promptKiller(api, threadID) {
    const game = gameData[threadID];
    if (!game || !game.killer || !game.killer.isAlive) {
        return; // Killer is dead or game not active
    }

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive && p.userID !== game.killer.userID);
    if (alivePlayers.length === 0) {
        return api.sendMessage("لا يوجد أحد ليقوم القاتل بقتله. تنتهي اللعبة.", threadID);
    }

    let playerList = "الرجاء قم باختيار الشخص الذي تريده كضحيتك من خلال رقمه:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
    });

    game.currentAction = {
        type: "killer_choice",
        promptMessageID: null // To store message ID for replies
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
        }
    });

    api.sendMessage(`القاتل يختار ضحيته في صمت...`, threadID);
}

async function promptPolice(api, threadID) {
    const game = gameData[threadID];
    if (!game || !game.police || !game.police.isAlive) {
        // If police is dead or not in game, directly proceed to outcome
        return processNightOutcome(api, threadID);
    }

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    if (alivePlayers.length === 0) {
        return api.sendMessage("لا يوجد أحد ليقوم الشرطي بحمايته. تنتهي اللعبة.", threadID);
    }

    let playerList = "الرجاء قم باختيار الشخص الذي تريد حمايته من خلال رقمه:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
    });

    game.currentAction = {
        type: "police_choice",
        promptMessageID: null
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
    let storyType = "day_outcome";
    let gameInfo = {
        killerChosen: killerChosenPlayer ? killerChosenPlayer.playerNumber : null,
        policeChosen: policeChosenPlayer ? policeChosenPlayer.playerNumber : null
    };

    if (killerChosenPlayer) {
        if (policeChosenPlayer && killerChosenPlayer.playerNumber === policeChosenPlayer.playerNumber) {
            // Protected!
            gameInfo.killedPlayer = killerChosenPlayer; // Still mention the target to make story clear
            gameInfo.protectedPlayer = policeChosenPlayer;
            await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            api.sendMessage(`👏 تم حماية ${killerChosenPlayer.name} بنجاح من قبل الشرطي!`, threadID);
        } else {
            // Not protected, or police chose someone else
            killedPlayer = killerChosenPlayer;
            killedPlayer.isAlive = false;
            gameInfo.killedPlayer = killedPlayer;
            if (policeChosenPlayer) {
                 await sendTypingMessage(api, threadID, generateStory("police_wrong_guess", gameInfo), 3000);
            } else {
                 await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            }

            api.sendMessage(`💀 لقد مات ${killedPlayer.name} (رقم ${killedPlayer.playerNumber}) ولم يعد بإمكانه المشاركة.`, threadID);
        }
    } else {
        // Killer didn't choose or no killer (unlikely at this stage if game active)
        await sendTypingMessage(api, threadID, generateStory("day_outcome"), 3000); // No one died story
        api.sendMessage("لم يقتل أحد هذه الليلة! يبدو أن القاتل كان نائمًا أو لم يتمكن من اختيار ضحيته.", threadID);
    }

    game.killerChoice = null;
    game.policeChoice = null;
    game.status = "day_voting_phase";
    saveGameData();

    // Check for game end conditions
    checkGameEnd(api, threadID);
    if (gameData[threadID] && gameData[threadID].status === "day_voting_phase") { // Only proceed if game is still active
        await promptVoting(api, threadID);
    }
}


async function promptVoting(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    if (alivePlayers.length <= 1) {
        return checkGameEnd(api, threadID); // Not enough players for voting, check end game.
    }

    let playerList = "الرجاء من الجميع التصويت على القاتل المشتبه به!\n";
    playerList += "ردوا على هذه الرسالة برقم الشخص الذي تشكون به:\n";
    alivePlayers.forEach(p => {
        playerList += `${p.playerNumber}. ${p.name}\n`;
        p.votes = 0; // Reset votes for new round
    });

    game.currentAction = {
        type: "voting",
        promptMessageID: null
    };
    saveGameData();

    api.sendMessage(playerList, threadID, (err, info) => {
        if (!err && info) {
            game.currentAction.promptMessageID = info.messageID;
            saveGameData();
        }
    });
}

async function processVotingOutcome(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    let maxVotes = 0;
    let suspectedPlayers = [];

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);

    alivePlayers.forEach(p => {
        if (p.votes > maxVotes) {
            maxVotes = p.votes;
            suspectedPlayers = [p];
        } else if (p.votes === maxVotes && p.votes > 0) {
            suspectedPlayers.push(p);
        }
    });

    if (maxVotes === 0) {
        api.sendMessage("لم يصوت أحد هذه الجولة! القاتل ينجو ليلة أخرى...", threadID);
        game.status = "night_killer_phase"; // No votes, killer gets another turn
        saveGameData();
        return promptKiller(api, threadID);
    }

    if (suspectedPlayers.length > 1) {
        api.sendMessage(`تعادل في الأصوات! اللاعبون ${suspectedPlayers.map(p => p.name).join(', ')} حصلوا على ${maxVotes} صوتًا. لا يوجد إعدام هذه الليلة.`, threadID);
        game.status = "night_killer_phase"; // Tie, killer gets another turn
        saveGameData();
        return promptKiller(api, threadID);
    }

    const accusedPlayer = suspectedPlayers[0];
    api.sendMessage(`بعد فرز الأصوات، تم اتهام ${accusedPlayer.name} (رقم ${accusedPlayer.playerNumber}) بأغلبية الأصوات!`, threadID);

    setTimeout(async () => {
        if (accusedPlayer.role === "قاتل") {
            api.sendMessage(`🎉 مبروك! لقد كان ${accusedPlayer.name} هو القاتل! لقد تم كشفه وتمت إدانته!`, threadID);
            api.sendMessage(`**انتهت اللعبة!** لقد فاز المدنيون!`, threadID);
            delete gameData[threadID]; // End game
        } else {
            api.sendMessage(`💔 للأسف، ${accusedPlayer.name} لم يكن القاتل. لقد أعدمتم شخصًا بريئًا!`, threadID);
            accusedPlayer.isAlive = false;
            saveGameData();
            await api.sendMessage(`أيها ${accusedPlayer.role} (رقم ${accusedPlayer.playerNumber})، لقد تم إعدامك ظلماً. لم تعد مشاركاً في اللعبة.`, accusedPlayer.userID);
            checkGameEnd(api, threadID);
            if (gameData[threadID] && gameData[threadID].status !== "game_over") { // If game is not over
                game.status = "night_killer_phase";
                saveGameData();
                api.sendMessage(`ليل جديد يحل على القرية... القاتل يختار ضحيته.`, threadID);
                promptKiller(api, threadID);
            }
        }
        saveGameData();
    }, 3000);
}

function checkGameEnd(api, threadID) {
    const game = gameData[threadID];
    if (!game) return;

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);
    const aliveKillers = alivePlayers.filter(p => p.role === "قاتل");
    const aliveVillagers = alivePlayers.filter(p => p.role !== "قاتل");

    if (aliveKillers.length === 0) {
        api.sendMessage("🎉 مبروك! تم القضاء على جميع القتلة. **لقد فاز المدنيون!**", threadID);
        delete gameData[threadID];
        game.status = "game_over"; // Set status to prevent further actions
    } else if (aliveKillers.length >= aliveVillagers.length) {
        api.sendMessage("💔 يا للأسف! عدد القتلة أصبح مساوياً أو أكثر من عدد المدنيين. **لقد فاز القتلة!**", threadID);
        delete gameData[threadID];
        game.status = "game_over";
    }
    saveGameData();
}

// --- Module Exports ---

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, senderID, body, isGroup, mentions, messageReply } = event;

    if (!isGroup) return; // Only process in group chats

    const game = gameData[threadID];

    // --- Joining the game ---
    if (body && (body.toLowerCase() === "تم" || body.toLowerCase() === "نعم") &&
        game && game.status === "joining" &&
        messageReply && messageReply.messageID === game.joinMessageID) {

        if (game.players[senderID]) {
            return api.sendMessage("لقد انضممت بالفعل إلى اللعبة!", threadID, messageID);
        }

        api.getUserInfo(senderID, (err, info) => {
            if (err) return console.error("Error getting user info:", err);
            const userName = info[senderID].name;
            game.players[senderID] = { userID: senderID, name: userName };
            saveGameData();
            api.sendMessage(`لقد انضم ${userName} إلى اللعبة! العدد الحالي: ${Object.keys(game.players).length}`, threadID);
            api.sendMessage(`الرجاء قم بتفقد طلبات المراسلة (أو رسائل السباام) لتلقي دورك سرياً.`, senderID);
        });
        return;
    }

    // --- Private message actions (Killer/Police choices) ---
    if (!isGroup && game) { // This event is a private message from a player
        const activeGameThreadID = Object.keys(gameData).find(tid =>
            gameData[tid] && gameData[tid].players[senderID] &&
            gameData[tid].currentAction && gameData[tid].currentAction.promptMessageID === messageReply?.messageID
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

            if (gameInQuestion.currentAction.type === "killer_choice" && player.role === "قاتل") {
                gameInQuestion.killerChoice = chosenNumber;
                api.sendMessage(`تم اختيارك للضحية رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                gameInQuestion.status = "night_police_phase"; // Move to police phase
                saveGameData();
                api.sendMessage(`القاتل اختار ضحيته... الآن دور الشرطي ليحمي أحدهم.`, activeGameThreadID);
                promptPolice(api, activeGameGameThreadID); // Prompt police after killer chooses
            } else if (gameInQuestion.currentAction.type === "police_choice" && player.role === "شرطي") {
                gameInQuestion.policeChoice = chosenNumber;
                api.sendMessage(`تم اختيارك لحماية الشخص رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                gameInQuestion.status = "night_outcome_processing"; // Move to processing
                saveGameData();
                api.sendMessage(`الشرطي قام بواجبه... نترقب نتائج هذه الليلة.`, activeGameThreadID);
                setTimeout(() => processNightOutcome(api, activeGameThreadID), 3000); // Process outcome after a short delay
            } else {
                api.sendMessage("ليس دورك الآن أو أنك لست مخولاً بالقيام بهذا الإجراء.", senderID);
            }
            gameInQuestion.currentAction = null; // Clear action after processing
            saveGameData();
        }
        return;
    }


    // --- Public Voting ---
    if (body && game && game.status === "day_voting_phase" &&
        messageReply && messageReply.messageID === game.currentAction?.promptMessageID) {

        const chosenNumber = parseInt(body);
        if (isNaN(chosenNumber)) {
            return api.sendMessage("الرجاء الرد برقم صالح.", threadID, messageID);
        }

        const voter = game.players[senderID];
        if (!voter || !voter.isAlive) {
            return api.sendMessage("لا يمكنك التصويت لأنك لست مشاركاً حياً في اللعبة.", threadID, messageID);
        }
        if (game.hasVoted && game.hasVoted.includes(senderID)) {
             return api.sendMessage("لقد قمت بالتصويت بالفعل في هذه الجولة.", threadID, messageID);
        }

        const targetPlayer = Object.values(game.players).find(p => p.playerNumber === chosenNumber && p.isAlive);

        if (!targetPlayer) {
            return api.sendMessage("الرقم الذي اخترته غير صحيح أو اللاعب ميت. الرجاء اختيار رقم لاعب حي.", threadID, messageID);
        }

        targetPlayer.votes = (targetPlayer.votes || 0) + 1;
        game.hasVoted = game.hasVoted || [];
        game.hasVoted.push(senderID);

        api.sendMessage(`تم التصويت على ${targetPlayer.name} (رقم ${targetPlayer.playerNumber}) بواسطة ${voter.name}.`, threadID, messageID);
        saveGameData();

        // Check if all alive players have voted
        const alivePlayersCount = Object.values(game.players).filter(p => p.isAlive).length;
        if (game.hasVoted.length === alivePlayersCount) {
             api.sendMessage("تم الانتهاء من التصويت! ننتظر فرز الأصوات...", threadID);
             game.hasVoted = []; // Reset for next round
             game.currentAction = null; // Clear voting prompt
             saveGameData();
             setTimeout(() => processVotingOutcome(api, threadID), 3000);
        }
        return;
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0] ? args[0].toLowerCase() : "";

    // --- Start a new game (المشاركة) ---
    if (command === "المشاركة" || event.body.indexOf("المشاركة") === 0) {
        if (gameData[threadID] && gameData[threadID].status !== "game_over") {
            return api.sendMessage("يوجد بالفعل لعبة قيد التشغيل أو في انتظار الانضمام في هذه المجموعة. الرجاء الانتظار أو إلغاء اللعبة الحالية.", threadID);
        }

        gameData[threadID] = {
            status: "joining", // 'joining', 'starting', 'night_killer_phase', 'night_police_phase', 'night_outcome_processing', 'day_voting_phase', 'game_over'
            players: {}, // { userID: { name, role, playerNumber, isAlive, votes } }
            joinMessageID: null, // To track the message players reply to for joining
            killer: null,
            police: null,
            killerChoice: null,
            policeChoice: null,
            currentAction: null, // { type: 'killer_choice' | 'police_choice' | 'voting', promptMessageID }
            hasVoted: [] // To track who has voted in current round
        };
        saveGameData();

        const joinMessage = `
            اللعبة ستبدأ قريباً!
            الرجاء من المشاركين الرد على هذه الرسالة بـ "**تم**" أو "**نعم**" للانضمام.
            العدد المطلوب: ${gameConfig.minPlayers} لاعبين على الأقل.
        `;
        api.sendMessage(joinMessage, threadID, (err, info) => {
            if (!err && info) {
                gameData[threadID].joinMessageID = info.messageID;
                saveGameData();
            }
        });
        return;
    }

    // --- Manually start game (بداية اللعبة) ---
    if (command === "بداية_اللعبة" || event.body.indexOf("بداية اللعبة") === 0) {
        if (gameData[threadID] && gameData[threadID].status === "joining") {
            startGame(api, threadID);
        } else {
            api.sendMessage("لا توجد لعبة في مرحلة الانضمام لتبدأ. ابدأ لعبة جديدة بقول 'المشاركة'.", threadID);
        }
        return;
    }

    // --- Cancel game (إلغاء اللعبة) ---
    if (command === "إلغاء_اللعبة" || event.body.indexOf("إلغاء اللعبة") === 0) {
        if (gameData[threadID]) {
            delete gameData[threadID];
            saveGameData();
            api.sendMessage("تم إلغاء اللعبة بنجاح.", threadID);
        } else {
            api.sendMessage("لا توجد لعبة قيد التشغيل في هذه المجموعة لإلغائها.", threadID);
        }
        return;
    }

    // --- Default 'women' command (from your original code) ---
    // This part remains from your original code, if you want to keep it.
    if (event.body.toLowerCase().includes("women") || event.body.includes("☕")) {
        const msg = {
            body: "hahaha Women 🤣",
            attachment: fs.createReadStream(__dirname + `/noprefix/wn.mp4`) // Make sure this path is correct
        };
        api.sendMessage(msg, threadID, messageID);
        api.setMessageReaction("☕", event.messageID, (err) => {}, true);
    }
};
