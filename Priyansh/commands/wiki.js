const fs = require("fs");

// --- Game State Management ---
let gameData = {};
const GAME_DATA_FILE = __dirname + "/werewolf_game_data.json";

function loadGameData() {
    try {
        gameData = JSON.parse(fs.readFileSync(GAME_DATA_FILE, "utf8"));
    } catch (e) {
        console.error("Failed to load game data or file does not exist. Initializing new data.", e);
        gameData = {}; // Initialize if file doesn't exist or is invalid
    }
}

function saveGameData() {
    try {
        fs.writeFileSync(GAME_DATA_FILE, JSON.stringify(gameData, null, 2), "utf8");
    } catch (e) {
        console.error("Failed to save game data:", e);
    }
}

loadGameData(); // Load data when the bot starts

// --- Game Configuration ---
const gameConfig = {
    minPlayers: 4, // Minimum players required to start a game
    maxPlayers: 15, // Maximum players allowed
    adminID: "100015903097543", // <<<<< REPLACE WITH THE ADMIN'S FACEBOOK USER ID
    roles: [
        { name: "قاتل", type: "killer" },
        { name: "شرطي", type: "police" },
        { name: "قروي", type: "villager" }
    ],
    votingTime: 60000 // 60 seconds for voting
};

module.exports.config = {
    name: "werewolf_game",
    version: "2.1.0", // Updated version
    hasPermssion: 0,
    credits: "Your Name", // Change this to your name
    description: "A custom Werewolf-like game with admin controls.",
    commandCategory: "Game",
    usages: "المشاركين | ابدا | ابدا اللعبة | ابدا تصويت | إلغاء اللعبة",
    cooldowns: 5,
};

// --- Helper Functions ---

/**
 * Assigns roles (1 Killer, 1 Police, rest Villagers) to players.
 * @param {Array} players - Array of player objects {userID, name}.
 * @returns {Array} - Players with assigned roles and numbers.
 */
function assignRoles(players) {
    // Create a mutable copy of players
    let shuffledPlayers = [...players].sort(() => 0.5 - Math.random());

    let assignedPlayers = [];
    let killerAssigned = false;
    let policeAssigned = false;

    for (let i = 0; i < players.length; i++) {
        let player = shuffledPlayers[i];
        let role = "قروي"; // Default role is Villager

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
            playerNumber: i + 1, // Assign player numbers sequentially after shuffling
            isAlive: true,
            votes: 0
        });
    }

    // Shuffle assigned players again to randomize player numbers visually
    assignedPlayers.sort(() => 0.5 - Math.random());
    assignedPlayers.forEach((p, index) => p.playerNumber = index + 1);

    return assignedPlayers;
}


/**
 * Generates a short story for the beginning of the game or a new day's outcome.
 * @param {string} type - 'start' or 'day_outcome' or 'police_wrong_guess'.
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
        const { killedPlayer, protectedPlayer, killerChosenNumber, policeChosenNumber } = gameInfo;

        if (killedPlayer) { // Someone was targeted
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
        } else { // No one was killed or targeted
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
    game.players = {}; // Reset players object
    assignedPlayers.forEach(p => {
        game.players[p.userID] = p;
    });
    game.killer = assignedPlayers.find(p => p.role === "قاتل");
    game.police = assignedPlayers.find(p => p.role === "شرطي");
    game.status = "roles_assigned";

    saveGameData();

    // Inform players privately about their roles
    for (const player of assignedPlayers) {
        await api.sendMessage(
            `مرحباً ${player.name}!\nشخصيتك في اللعبة هي: **${player.role}**.\nرقمك في اللعبة هو: **${player.playerNumber}**.`,
            player.userID
        ).catch(e => console.error(`Error sending private message to ${player.name} (${player.userID}):`, e));
    }

    api.sendMessage(`تم توزيع الأدوار للمشاركين!`, threadID);
    api.sendMessage(`أيها المسؤول، قل 'ابدا اللعبة' لبدء اللعب.`, threadID);
}

async function startGamePhase2(api, threadID) {
    const game = gameData[threadID];
    if (!game || game.status !== "roles_assigned") {
        return api.sendMessage("الأدوار لم توزع بعد أو اللعبة ليست جاهزة للبدء.", threadID);
    }

    game.status = "night_killer_phase"; // First phase: Killer chooses
    saveGameData();

    // Start the game story
    await sendTypingMessage(api, threadID, generateStory("start"), 3000);

    // Prompt Killer to choose victim
    await promptKiller(api, threadID);

    saveGameData();
}

async function promptKiller(api, threadID) {
    const game = gameData[threadID];
    if (!game || !game.killer || !game.killer.isAlive) {
        // If killer is dead or not in game, directly proceed to outcome or next phase
        return processNightOutcome(api, threadID);
    }

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive && p.userID !== game.killer.userID);
    if (alivePlayers.length === 0) {
        // All other players are dead, Killer wins!
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
        promptMessageID: null, // To store message ID for replies
        threadID: threadID // Store threadID for PM response handling
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
            console.error("Error sending killer prompt:", err);
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
        return api.sendMessage("لا يوجد أحد ليقوم الشرطي بحمايته. تنتهي اللعبة.", threadID); // Should not happen if killer already chose
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
            console.error("Error sending police prompt:", err);
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

    if (killerChosenPlayer) { // Killer chose someone
        gameInfo.killedPlayer = killerChosenPlayer;
        if (policeChosenPlayer && killerChosenPlayer.playerNumber === policeChosenPlayer.playerNumber) {
            // Protected!
            gameInfo.protectedPlayer = policeChosenPlayer;
            await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            api.sendMessage(`✅`, threadID); // Emoji for protected
        } else {
            // Not protected, or police chose someone else
            killedPlayer = killerChosenPlayer;
            killedPlayer.isAlive = false;
            gameInfo.killedPlayer = killedPlayer;
            if (policeChosenPlayer) { // Police was active but chose wrong
                 await sendTypingMessage(api, threadID, generateStory("police_wrong_guess", gameInfo), 3000);
            } else { // Police was not active or didn't choose (or dead)
                 await sendTypingMessage(api, threadID, generateStory("day_outcome", gameInfo), 3000);
            }
            api.sendMessage(`✅`, threadID); // Emoji for killed
            api.sendMessage(`💀 لقد مات **${killedPlayer.name}** (رقم ${killedPlayer.playerNumber}) ولم يعد بإمكانه المشاركة.`, threadID);
            api.sendMessage(`أيها ${killedPlayer.role} (رقم ${killedPlayer.playerNumber})، لقد تم قتلك. لم تعد مشاركاً في اللعبة.`, killedPlayer.userID)
                .catch(e => console.error(`Error sending death message to ${killedPlayer.name}:`, e));
        }
    } else { // Killer didn't choose a valid target or chose no one
        await sendTypingMessage(api, threadID, generateStory("day_outcome"), 3000); // No one died story
        api.sendMessage(`✅`, threadID); // Emoji for no death
        api.sendMessage("لم يقتل أحد هذه الليلة! يبدو أن القاتل كان نائمًا أو لم يتمكن من اختيار ضحيته.", threadID);
    }

    game.killerChoice = null;
    game.policeChoice = null;
    saveGameData();

    // Check for game end conditions after night outcome
    checkGameEnd(api, threadID);
    if (gameData[threadID] && gameData[threadID].status !== "game_over") { // Only prompt for voting if game is still active
        api.sendMessage(`أيها المسؤول، قل 'ابدا تصويت' لبدء مرحلة التصويت.`, threadID);
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
        promptMessageID: null,
        threadID: threadID,
        voteEndTime: Date.now() + gameConfig.votingTime,
        votedUsers: []
    };
    saveGameData();

    // Send private voting prompts
    for (const player of alivePlayers) {
        api.sendMessage(playerList, player.userID, (err, info) => {
            if (!err && info) {
                // Store the message ID for each player's private voting prompt
                if (!game.currentAction.promptMessageID_private) {
                    game.currentAction.promptMessageID_private = {};
                }
                game.currentAction.promptMessageID_private[player.userID] = info.messageID;
                saveGameData();
            } else {
                console.error(`Error sending voting prompt to ${player.name}:`, err);
            }
        });
    }

    api.sendMessage(`بدأ التصويت على القاتل! لديكم ${gameConfig.votingTime / 1000} ثانية للتصويت سرياً عبر الخاص.`, threadID);

    // Set a timeout for processing votes
    setTimeout(() => processVotingOutcome(api, threadID), gameConfig.votingTime + 2000); // Add a small buffer
}

async function processVotingOutcome(api, threadID) {
    const game = gameData[threadID];
    if (!game || game.status !== "voting_active") return; // Ensure voting is active

    let maxVotes = 0;
    let suspectedPlayers = [];
    let voteCounts = {}; // To store actual counts for display

    const alivePlayers = Object.values(game.players).filter(p => p.isAlive);

    // Gather vote counts
    alivePlayers.forEach(p => {
        voteCounts[p.playerNumber] = p.votes;
        if (p.votes > maxVotes) {
            maxVotes = p.votes;
            suspectedPlayers = [p];
        } else if (p.votes === maxVotes && p.votes > 0) {
            suspectedPlayers.push(p);
        }
    });

    game.currentAction = null; // Clear voting action
    saveGameData();

    if (maxVotes === 0) {
        api.sendMessage("لم يصوت أحد هذه الجولة أو لم يتم جمع أصوات كافية! القاتل ينجو ليلة أخرى...", threadID);
        game.status = "night_killer_phase"; // No votes, killer gets another turn
        saveGameData();
        return promptKiller(api, threadID);
    }

    // Sort players by vote count for display
    const sortedVoteDisplay = alivePlayers.sort((a, b) => b.votes - a.votes)
                                         .map(p => `${p.name} (رقم ${p.playerNumber}): ${p.votes} صوتًا`)
                                         .join("\n");

    api.sendMessage(`نتائج التصويت:\n${sortedVoteDisplay}`, threadID);

    setTimeout(async () => {
        if (suspectedPlayers.length > 1) {
            api.sendMessage(`تعادل في الأصوات! لا يوجد إعدام هذه الليلة.`, threadID);
            game.status = "night_killer_phase"; // Tie, killer gets another turn
            saveGameData();
            return promptKiller(api, threadID);
        }

        const accusedPlayer = suspectedPlayers[0];
        api.sendMessage(`بعد فرز الأصوات، تم اتهام **${accusedPlayer.name}** (رقم ${accusedPlayer.playerNumber}) بأغلبية الأصوات!`, threadID);

        setTimeout(async () => {
            if (accusedPlayer.role === "قاتل") {
                api.sendMessage(`🎉 مبروك! لقد كان **${accusedPlayer.name}** هو القاتل! لقد تم كشفه وتمت إدانته!`, threadID);
                api.sendMessage(`**انتهت اللعبة!** لقد فاز القرويون!`, threadID);
                delete gameData[threadID]; // End game
            } else if (accusedPlayer.role === "شرطي") {
                api.sendMessage(`💔 للأسف، لقد تم تصويت القرويين على قتل **شرطيهم** الذي يحميكم، **${accusedPlayer.name}**! لقد أعدمتم شخصًا بريئًا ومفيدًا!`, threadID);
                accusedPlayer.isAlive = false;
                api.sendMessage(`أيها ${accusedPlayer.role} (رقم ${accusedPlayer.playerNumber})، لقد تم إعدامك ظلماً. لم تعد مشاركاً في اللعبة.`, accusedPlayer.userID)
                    .catch(e => console.error(`Error sending death message to ${accusedPlayer.name}:`, e));
                saveGameData();
                checkGameEnd(api, threadID);
                if (gameData[threadID] && gameData[threadID].status !== "game_over") {
                    game.status = "night_killer_phase";
                    api.sendMessage(`ليل جديد يحل على القرية... القاتل يختار ضحيته.`, threadID);
                    promptKiller(api, threadID);
                }
            } else { // Accused is a Villager
                api.sendMessage(`💔 للأسف، **${accusedPlayer.name}** لم يكن القاتل. لقد أعدمتم شخصًا قروياً عادياً وبسيطاً!`, threadID);
                accusedPlayer.isAlive = false;
                api.sendMessage(`أيها ${accusedPlayer.role} (رقم ${accusedPlayer.playerNumber})، لقد تم إعدامك ظلماً. لم تعد مشاركاً في اللعبة.`, accusedPlayer.userID)
                    .catch(e => console.error(`Error sending death message to ${accusedPlayer.name}:`, e));
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
    const aliveCivilians = alivePlayers.filter(p => p.role !== "قاتل"); // This now includes Police as civilian side

    if (aliveKillers.length === 0) {
        api.sendMessage("🎉 مبروك! تم القضاء على القاتل. **لقد فاز القرويون!**", threadID);
        delete gameData[threadID];
        game.status = "game_over"; // Set status to prevent further actions
    } else if (aliveKillers.length >= aliveCivilians.length) { // Killer wins if number of killers >= number of civilians
        api.sendMessage("💔 يا للأسف! عدد القتلة أصبح مساوياً أو أكثر من عدد القرويين. **لقد فاز القاتل!**", threadID);
        delete gameData[threadID];
        game.status = "game_over";
    }
    saveGameData();
}

// --- Module Exports ---

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, senderID, body, isGroup, messageReply } = event;

    // Check if the game is active in this thread
    const game = gameData[threadID];

    // --- Joining the game ---
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
            if (err) return console.error("Error getting user info:", err);
            const userName = info[senderID].name;
            game.players[senderID] = { userID: senderID, name: userName };
            saveGameData();
            api.sendMessage(`لقد انضم **${userName}** إلى اللعبة! العدد الحالي: ${Object.keys(game.players).length}`, threadID);
            api.sendMessage(`الرجاء قم بتفقد طلبات المراسلة (أو رسائل السباام) لتلقي دورك سرياً عندما تبدأ اللعبة.`, senderID)
                .catch(e => console.error("Error sending private message confirmation:", e));
        });
        return;
    }

    // --- Private message actions (Killer/Police choices & Voting) ---
    if (!isGroup) { // This event is a private message from a player
        // Find which game this private message belongs to (if any)
        const activeGameThreadID = Object.keys(gameData).find(tid =>
            gameData[tid] && gameData[tid].players[senderID] &&
            gameData[tid].currentAction && gameData[tid].currentAction.threadID === tid && // Ensure it's for this specific game
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

            // Killer's choice
            if (gameInQuestion.currentAction.type === "killer_choice" && player.role === "قاتل" && player.isAlive) {
                if (targetPlayer.userID === player.userID) {
                    return api.sendMessage("لا يمكنك قتل نفسك!", senderID);
                }
                gameInQuestion.killerChoice = chosenNumber;
                api.sendMessage(`تم اختيارك للضحية رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                // After killer chooses, immediately prompt police if alive, otherwise process outcome
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
                gameInQuestion.currentAction = null; // Clear action after processing
                saveGameData();
                return;
            }

            // Police's choice
            if (gameInQuestion.currentAction.type === "police_choice" && player.role === "شرطي" && player.isAlive) {
                gameInQuestion.policeChoice = chosenNumber;
                api.sendMessage(`تم اختيارك لحماية الشخص رقم ${chosenNumber}: ${targetPlayer.name}.`, senderID);
                gameInQuestion.status = "night_outcome_processing";
                gameInQuestion.currentAction = null; // Clear action after processing
                saveGameData();
                api.sendMessage(`الشرطي قام بواجبه... نترقب نتائج هذه الليلة.`, activeGameThreadID);
                setTimeout(() => processNightOutcome(api, activeGameThreadID), 3000);
                return;
            }

            // Voting
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

            // Fallback for unauthorized/invalid private actions
            api.sendMessage("ليس دورك الآن أو أنك لست مخولاً بالقيام بهذا الإجراء.", senderID);
        }
        return;
    }

    // --- Group chat commands ---
    if (isGroup) {
        // Your original 'women' command, if you want to keep it
        if (body && (body.toLowerCase().includes("women") || body.includes("☕"))) {
            const msg = {
                body: "hahaha Women 🤣",
                attachment: fs.createReadStream(__dirname + `/noprefix/wn.mp4`) // Make sure this path is correct
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

    // --- Admin-only commands ---
    const isAdmin = senderID === gameConfig.adminID;

    // Command: المشاركين (Initiate Game)
    if (command === "المشاركين" && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status !== "game_over") {
            return api.sendMessage("يوجد بالفعل لعبة قيد التشغيل أو في انتظار الانضمام في هذه المجموعة. الرجاء الانتظار أو إلغاء اللعبة الحالية.", threadID);
        }

        gameData[threadID] = {
            status: "joining", // 'joining', 'roles_assigned', 'night_killer_phase', etc.
            players: {}, // { userID: { name, role, playerNumber, isAlive, votes } }
            joinMessageID: null, // To track the message players reply to for joining
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

    // Command: ابدا (Admin starts role distribution)
    if (command === "ابدا" && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status === "joining") {
            startGamePhase1(api, threadID);
        } else {
            api.sendMessage("اللعبة ليست في مرحلة الانضمام لبدء توزيع الأدوار. تأكد من أنك قلت 'المشاركين' أولاً.", threadID);
        }
        return;
    }

    // Command: ابدا اللعبة (Admin starts game story/night phase)
    if ((command === "ابدا_اللعبة" || event.body === "ابدا اللعبة") && isAdmin) {
        if (gameData[threadID] && gameData[threadID].status === "roles_assigned") {
            startGamePhase2(api, threadID);
        } else if (gameData[threadID] && gameData[threadID].status === "night_killer_phase") {
             api.sendMessage("اللعبة بدأت بالفعل، القاتل يختار ضحيته.", threadID);
        }
        else if (gameData[threadID] && (gameData[threadID].status === "day_voting_phase" || gameData[threadID].status === "night_outcome_processing" || gameData[threadID].status === "night_police_phase")) {
            // This means a new day/night cycle
            gameData[threadID].status = "night_killer_phase"; // Reset to killer phase for new round
            saveGameData();
            api.sendMessage("ليل جديد يحل على القرية... القاتل يختار ضحيته.", threadID);
            promptKiller(api, threadID);
        }
        else {
            api.sendMessage("لا توجد لعبة في مرحلة جاهزة للبدء أو الأدوار لم توزع بعد. تأكد من أنك قلت 'المشاركين' ثم 'ابدا' أولاً.", threadID);
        }
        return;
    }

    // Command: ابدا تصويت (Admin starts voting phase)
    if ((command === "ابدا_تصويت" || event.body === "ابدا تصويت") && isAdmin) {
        if (gameData[threadID] && (gameData[threadID].status === "night_outcome_processing" || gameData[threadID].status === "night_killer_phase" || gameData[threadID].status === "night_police_phase" || gameData[threadID].status === "roles_assigned")) {
            if (gameData[threadID].status === "night_outcome_processing") {
                 api.sendMessage("انتظر حتى تكتمل أحداث الليلة قبل بدء التصويت.", threadID);
                 return;
            }
            gameData[threadID].status = "voting_active"; // Set status to voting
            saveGameData();
            promptVoting(api, threadID);
        } else {
            api.sendMessage("لا يمكنك بدء التصويت الآن. تأكد من أن اللعبة في المرحلة الصحيحة.", threadID);
        }
        return;
    }

    // Command: إلغاء اللعبة (Admin cancels game)
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

    // Non-admin attempts to use admin commands
    if (!isAdmin && (command === "المشاركين" || command === "ابدا" || command === "ابدا_اللعبة" || event.body === "ابدا اللعبة" || command === "ابدا_تصويت" || event.body === "ابدا تصويت" || command === "إلغاء_اللعبة" || event.body === "إلغاء اللعبة")) {
        api.sendMessage("أنت لست المسؤول عن هذه اللعبة.", threadID, messageID);
    }
};
