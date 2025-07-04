const fs = require("fs");

// Constants
const AUTHORIZED_USER_ID = "100015903097543"; // قم بتغيير هذا إلى معرّف المستخدم المطور الخاص بك
const MIN_PLAYERS = 3; // الحد الأدنى لعدد اللاعبين لبدء اللعبة

// Role definitions
const GAME_ROLES = {
    killer: { name: "القاتل", team: "evil", description: "أنت القاتل! مهمتك هي القضاء على جميع القرويين والشرطي. اختر ضحيتك سراً في كل ليلة." },
    cop: { name: "الشرطي", team: "good", description: "أنت الشرطي! مهمتك هي حماية الأبرياء. في كل ليلة، اختر شخصًا لحمايته من هجوم القاتل." },
    villager: { name: "قروي", team: "good", description: "أنت قروي عادي. مهمتك هي اكتشاف القاتل والتصويت لإعدامه." },
    farmer: { name: "مزارع", team: "good", description: "أنت مزارع بسيط. مهمتك هي البقاء على قيد الحياة والمساعدة في كشف القاتل." },
    chef: { name: "طباخ", team: "good", description: "أنت طباخ ماهر. مهمتك هي البقاء على قيد الحياة والمساعدة في كشف القاتل." },
    builder: { name: "عامل بناء", team: "good", description: "أنت عامل بناء قوي. مهمتك هي البقاء على قيد الحياة والمساعدة في كشف القاتل." },
    // يمكنك إضافة المزيد من الأدوار العادية هنا
};

// Game state for each thread
let games = {}; // Key: threadID, Value: game state object

module.exports.config = {
    name: "مشاركة",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "YourName", // قم بتغيير هذا إلى اسمك
    description: "لعبة القاتل والشرطي السرية",
    commandCategory: "لعبة",
    usages: "مشاركة / مشاركة حالة / مشاركة انهاء",
    cooldowns: 5,
};

// Function to reset game state for a thread
function resetGame(threadID) {
    games[threadID] = {
        active: false,
        phase: "waiting_for_players", // waiting_for_players, night_action, voting
        players: [], // [{ id: "user_id", name: "user_name", role: "", alive: true, playerNum: 0 }]
        rolesAssigned: false,
        discussionMessageID: null, // For general group messages
        killerTarget: null, // ID of player killer wants to kill
        copProtect: null, // ID of player cop wants to protect
        votes: {}, // Key: voterID, Value: votedPlayerID
        dayNumber: 0,
        playerCounter: 0, // For assigning player numbers
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

    // If it's a private message, handle role assignments and night actions
    if (threadID === senderID) { // Private message
        const game = Object.values(games).find(g => g.players.some(p => p.id === senderID));
        if (!game || !game.active) return; // No active game for this player

        const player = game.players.find(p => p.id === senderID);
        if (!player) return;

        // Killer action
        if (game.phase === "night_action" && player.role === "killer" && !game.killerTarget) {
            const targetPlayerNum = parseInt(lowerCaseBody);
            const target = game.players.find(p => p.playerNum === targetPlayerNum && p.alive);

            if (target && target.id !== player.id) {
                game.killerTarget = target.id;
                api.sendMessage(`تم اختيار ${target.name} (رقم ${target.playerNum}) كضحية لك هذه الليلة.`, senderID);
                await checkAndProceedNightActions(api, game);
            } else {
                api.sendMessage("اختيار غير صالح. الرجاء إدخال رقم اللاعب الذي تريد قتله من القائمة أعلاه (لا يمكنك قتل نفسك).", senderID);
            }
        }
        // Cop action
        else if (game.phase === "night_action" && player.role === "cop" && !game.copProtect) {
            const protectPlayerNum = parseInt(lowerCaseBody);
            const target = game.players.find(p => p.playerNum === protectPlayerNum && p.alive);

            if (target) {
                game.copProtect = target.id;
                api.sendMessage(`تم اختيار ${target.name} (رقم ${target.playerNum}) للحماية هذه الليلة.`, senderID);
                await checkAndProceedNightActions(api, game);
            } else {
                api.sendMessage("اختيار غير صالح. الرجاء إدخال رقم اللاعب الذي تريد حمايته من القائمة أعلاه.", senderID);
            }
        }
        return;
    }

    // If it's a group message, handle joining and voting
    const game = games[threadID];
    if (!game || !game.active) {
        return;
    }

    // Handle replies for player joining
    if (game.phase === "waiting_for_players" && messageReply && messageReply.messageID === game.discussionMessageID) {
        if (!game.players.some(p => p.id === senderID)) {
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            game.playerCounter++;
            game.players.push({
                id: senderID,
                name: senderName,
                role: null,
                alive: true,
                playerNum: game.playerCounter
            });
            api.sendMessage(`تمت مشاركة ${senderName} في اللعبة! (${game.players.length} مشاركين)`, threadID);

            if (game.players.length === MIN_PLAYERS) { // Check if min players reached to proceed
                await distributeRoles(api, game);
                setTimeout(async () => {
                    await api.sendMessage("سوف تبدأ اللعبة بعد 15 ثانية... استعدوا!", threadID);
                }, 1000); // 1 second for message

                setTimeout(async () => {
                    await startGameRound(api, threadID, game);
                }, 15000); // 15 seconds for intro
            }
        } else {
            api.sendMessage("أنت بالفعل في قائمة المشاركين.", threadID, messageID);
        }
        return;
    }

    // Handle replies for voting
    if (game.phase === "voting" && messageReply && messageReply.messageID === game.discussionMessageID) {
        const voter = game.players.find(p => p.id === senderID && p.alive);
        if (!voter) return api.sendMessage("لا يمكنك التصويت لأنك لست لاعبًا حيًا.", threadID, messageID);

        const targetPlayerNum = parseInt(lowerCaseBody);
        const targetPlayer = game.players.find(p => p.playerNum === targetPlayerNum && p.alive);

        if (!targetPlayer) return api.sendMessage("رقم اللاعب غير صالح أو اللاعب ميت.", threadID, messageID);

        game.votes[voter.id] = targetPlayer.id;
        api.sendMessage(`تم التصويت على الشخص صاحب الرقم ${targetPlayer.playerNum}. (${Object.keys(game.votes).length}/${game.players.filter(p => p.alive).length} أصوات)`, threadID, messageID);

        if (Object.keys(game.votes).length === game.players.filter(p => p.alive).length) {
            await processVotes(api, threadID, game);
        }
        return;
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    // Only the authorized user can start/end games
    if (senderID !== AUTHORIZED_USER_ID) {
        return api.sendMessage("عذرًا، لا يمكنك استخدام هذا الأمر. أنت لست مطور البوت.", threadID, messageID);
    }

    const command = args[0] ? args[0].toLowerCase() : "";

    // Initialize game state if it doesn't exist for this thread
    if (!games[threadID]) {
        resetGame(threadID);
    }
    let game = games[threadID];

    switch (command) {
        case "": // Default command to start participation
        case "مشاركة":
        case "شارك":
        case "انضمام":
            if (game.active) {
                return api.sendMessage("اللعبة جارية بالفعل. لا يمكن بدء مشاركة جديدة.", threadID, messageID);
            }
            resetGame(threadID); // Ensure a clean slate
            game = games[threadID]; // Re-get the reference
            game.active = true;
            game.phase = "waiting_for_players";
            game.playerCounter = 0; // Reset player counter for new game

            api.sendMessage({
                body: `أهلاً بكم في لعبة القاتل والشرطي! الرجاء من المشاركين الرد على هذه الرسالة بـ "تم" أو "نعم" للانضمام. نحتاج إلى ${MIN_PLAYERS} لاعبين على الأقل للبدء.`,
            }, threadID, (err, info) => {
                if (!err) {
                    game.discussionMessageID = info.messageID;
                }
            });
            break;

        case "حالة":
        case "status":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية في هذه المجموعة.", threadID, messageID);
            }
            let statusMsg = "حالة لعبة القاتل والشرطي:\n";
            statusMsg += `المرحلة الحالية: ${game.phase === "waiting_for_players" ? "انتظار المشاركين" : game.phase === "night_action" ? "الليل (أفعال سرية)" : "التصويت (النهار)"}\n`;
            statusMsg += `عدد اللاعبين: ${game.players.length} (${game.players.filter(p => p.alive).length} أحياء)\n`;
            statusMsg += "اللاعبون الأحياء:\n";
            game.players.filter(p => p.alive).forEach(p => {
                statusMsg += `- ${p.name} (رقم ${p.playerNum})\n`;
            });
            api.sendMessage(statusMsg, threadID, messageID);
            break;

        case "انهاء":
        case "end":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية لإنهاءها.", threadID, messageID);
            }
            api.sendMessage("تم إنهاء لعبة القاتل والشرطي.", threadID, messageID);
            resetGame(threadID);
            break;

        default:
            api.sendMessage("أمر غير صالح. الاستخدام: مشاركة / مشاركة حالة / مشاركة انهاء.", threadID, messageID);
            break;
    }
};

// --- Game Logic Functions ---

async function distributeRoles(api, game) {
    game.rolesAssigned = true;
    const players = game.players;
    const rolesPool = [];

    // Add specific roles
    rolesPool.push("killer");
    rolesPool.push("cop");

    // Add other roles based on player count
    const otherRoles = ["villager", "farmer", "chef", "builder"];
    let otherRolesIndex = 0;
    while (rolesPool.length < players.length) {
        rolesPool.push(otherRoles[otherRolesIndex % otherRoles.length]);
        otherRolesIndex++;
    }

    // Shuffle roles
    for (let i = rolesPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesPool[i], rolesPool[j]] = [rolesPool[j], rolesPool[i]];
    }

    // Assign roles and send private messages
    for (let i = 0; i < players.length; i++) {
        players[i].role = rolesPool[i];
        await api.sendMessage(
            `مرحباً ${players[i].name}!\nشخصيتك في اللعبة هي: **${GAME_ROLES[players[i].role].name}**\nرقمك في اللعبة: **${players[i].playerNum}**\n\n${GAME_ROLES[players[i].role].description}`,
            players[i].id
        );
    }
    await api.sendMessage("تم توزيع الأدوار على المشاركين سراً. الرجاء تفقد طلبات المراسلة الخاصة بكم.", game.players[0].threadID);
}

async function startGameRound(api, threadID, game) {
    game.dayNumber++;
    game.phase = "night_action";
    game.killerTarget = null;
    game.copProtect = null;
    game.votes = {}; // Reset votes for new round

    const alivePlayers = game.players.filter(p => p.alive);
    if (alivePlayers.length <= 1) {
        return await checkWinConditions(api, threadID, game);
    }

    // Intro Story for the night
    const story = getNightIntroStory(game.dayNumber);
    await api.sendMessage({
        body: story
    }, threadID, (err, info) => {
        if (!err) {
            // This is to simulate typing... it's client-side and not controlled by bot directly
            // but can be faked with delays and sequential messages
        }
    });

    // Wait for the "typing" effect (simulated delay)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Send private instructions for killer
    const killerPlayer = game.players.find(p => p.role === "killer" && p.alive);
    if (killerPlayer) {
        let playerListMsg = "القائمة بالأسماء والأرقام:\n";
        alivePlayers.forEach(p => {
            if (p.id !== killerPlayer.id) // Killer cannot kill themselves
                playerListMsg += `- ${p.name} (رقم: ${p.playerNum})\n`;
        });
        await api.sendMessage(`أيها القاتل، حان دورك! الرجاء اختيار ضحيتك من القائمة التالية عن طريق إرسال رقم اللاعب:\n${playerListMsg}`, killerPlayer.id);
    }

    // Send private instructions for cop
    const copPlayer = game.players.find(p => p.role === "cop" && p.alive);
    if (copPlayer) {
        let playerListMsg = "القائمة بالأسماء والأرقام:\n";
        alivePlayers.forEach(p => playerListMsg += `- ${p.name} (رقم: ${p.playerNum})\n`);
        await api.sendMessage(`أيها الشرطي، حان دورك! الرجاء اختيار من تريد حمايته من القائمة التالية عن طريق إرسال رقم اللاعب:\n${playerListMsg}`, copPlayer.id);
    }

    // Set a timeout for night actions if players don't respond
    setTimeout(async () => {
        if (game.phase === "night_action") {
            await checkAndProceedNightActions(api, game); // Force proceed if not all actions taken
        }
    }, 30000); // 30 seconds for night actions
}

async function checkAndProceedNightActions(api, game) {
    const killerPlayer = game.players.find(p => p.role === "killer" && p.alive);
    const copPlayer = game.players.find(p => p.role === "cop" && p.alive);

    const killerActionTaken = !killerPlayer || (killerPlayer && game.killerTarget !== null);
    const copActionTaken = !copPlayer || (copPlayer && game.copProtect !== null);

    if (killerActionTaken && copActionTaken) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Short delay for suspense

        let outcomeStory = "\n";
        let victim = null;
        let isProtected = false;

        if (game.killerTarget) {
            victim = game.players.find(p => p.id === game.killerTarget);
            if (victim && game.copProtect === victim.id) {
                isProtected = true;
            }

            if (victim) {
                if (isProtected) {
                    outcomeStory += "في عمق الظلام، قام القاتل بمحاولة غادرة... لكن! 💪\n";
                    outcomeStory += `بفضل يقظة الشرطي السري، تمكن ${victim.name} من النجاة بأعجوبة! لقد كانت محاولة فاشلة! ✨`;
                } else {
                    victim.alive = false;
                    outcomeStory += "مرت ليلة مظلمة مليئة بالرعب... 🌑\n";
                    outcomeStory += `تم العثور على ${victim.name} ميتاً في الصباح الباكر! 💀 يبدو أن القاتل ضرب مجدداً!`;
                }
            } else {
                outcomeStory += "كانت ليلة هادئة بشكل مريب... لم يحدث شيء غير عادي. 🤫";
            }
        } else {
            outcomeStory += "كانت ليلة هادئة بشكل مريب... لم يحدث شيء غير عادي. 🤫";
        }

        await api.sendMessage(outcomeStory, game.players[0].threadID);

        await new Promise(resolve => setTimeout(resolve, 3000)); // Delay before win conditions/voting

        if (await checkWinConditions(api, game.players[0].threadID, game)) {
            return;
        }

        await startVotingPhase(api, game.players[0].threadID, game);
    }
}

async function startVotingPhase(api, threadID, game) {
    game.phase = "voting";
    game.votes = {};

    const alivePlayers = game.players.filter(p => p.alive);
    if (alivePlayers.length === 0) {
        api.sendMessage("لم يتبق أحد للتصويت! انتهت اللعبة.", threadID);
        resetGame(threadID);
        return;
    }

    let voteMessage = "\n--- صباح جديد. حان وقت التصويت! ---\n";
    voteMessage += "الرجاء التصويت على من تعتقدون أنه القاتل.\n";
    voteMessage += "اللاعبون الأحياء:\n";
    alivePlayers.forEach(p => {
        voteMessage += `- ${p.name} (رقم: ${p.playerNum})\n`;
    });
    voteMessage += "الرجاء الرد على هذه الرسالة برقم اللاعب الذي تشتبهون به.\n";

    await api.sendMessage({
        body: voteMessage
    }, threadID, (err, info) => {
        if (!err) {
            game.discussionMessageID = info.messageID;
        }
    });

    // Set a timeout for voting if players don't respond
    setTimeout(async () => {
        if (game.phase === "voting") {
            await processVotes(api, threadID, game); // Force process votes
        }
    }, 45000); // 45 seconds for voting
}

async function processVotes(api, threadID, game) {
    const voteCounts = {};
    for (const voterID in game.votes) {
        const targetID = game.votes[voterID];
        voteCounts[targetID] = (voteCounts[targetID] || 0) + 1;
    }

    let lynchedPlayer = null;
    let maxVotes = 0;
    let tied = false;

    for (const playerID in voteCounts) {
        if (voteCounts[playerID] > maxVotes) {
            maxVotes = voteCounts[playerID];
            lynchedPlayer = game.players.find(p => p.id === playerID);
            tied = false;
        } else if (voteCounts[playerID] === maxVotes) {
            tied = true;
        }
    }

    let voteResultMsg = "\n--- نتيجة التصويت ---\n";
    if (lynchedPlayer && !tied) {
        lynchedPlayer.alive = false;
        voteResultMsg += `بأغلبية الأصوات، تم إعدام ${lynchedPlayer.name} (رقم ${lynchedPlayer.playerNum}).\n`;

        if (lynchedPlayer.role === "killer") {
            voteResultMsg += `يا للروعة! لقد كان ${lynchedPlayer.name} هو القاتل! 🎉\n`;
            voteResultMsg += "لقد تم القبض على القاتل! القرويون يفوزون! 🥳";
            await api.sendMessage(voteResultMsg, threadID);
            resetGame(threadID);
            return;
        } else {
            voteResultMsg += `يا للأسف! ${lynchedPlayer.name} لم يكن القاتل. لقد أعدمتم شخصًا بريئًا. 😔`;
        }
    } else {
        voteResultMsg += "لم يتمكن اللاعبون من التوصل إلى قرار أو كان هناك تعادل. لم يتم إعدام أحد هذه المرة. 🤷";
    }
    await api.sendMessage(voteResultMsg, threadID);

    // Check win conditions after lynching
    if (await checkWinConditions(api, threadID, game)) {
        return;
    }

    // Start next round
    setTimeout(async () => {
        await startGameRound(api, threadID, game);
    }, 5000); // 5 seconds before next round
}

async function checkWinConditions(api, threadID, game) {
    const alivePlayers = game.players.filter(p => p.alive);
    const aliveKiller = alivePlayers.find(p => p.role === "killer");
    const aliveGoodGuys = alivePlayers.filter(p => p.role !== "killer");

    if (!aliveKiller) {
        api.sendMessage("لقد تم القضاء على القاتل! القرويون يفوزون! 🎉", threadID);
        resetGame(threadID);
        return true;
    }

    if (aliveKiller && aliveGoodGuys.length <= 1) { // If killer is equal or more than good guys (only one good guy left beside killer)
        api.sendMessage("القاتل يتفوق عددًا على البقية! القاتل يفوز! 🔪", threadID);
        resetGame(threadID);
        return true;
    }

    if (alivePlayers.length === 0) {
        api.sendMessage("يا للأسف! لم يتبق أي لاعب حي. انتهت اللعبة بدون فائز.", threadID);
        resetGame(threadID);
        return true;
    }

    return false; // No win condition met yet
}

function getNightIntroStory(dayNum) {
    const stories = [
        `اليوم هو ${getRandomDayName()}، والوقت الآن هو ${getRandomTime()}. في هذه الليلة الهادئة، تتسلل المخاوف إلى القلوب. يقف القاتل في الظل، يبحث عن فريسته التالية. بينما الشرطي، بعينيه الساهرة، يحاول حماية الأبرياء...`,
        `غروب الشمس يعلن عن بداية ليلة ${getRandomDayName()} أخرى في تمام الساعة ${getRandomTime()}. تنتشر الهمسات حول الجرائم الغامضة. القاتل يخطط لضربته، والشرطي مستعد للتدخل، لكن من سيسبق الآخر؟`,
        `عند منتصف ليل ${getRandomDayName()}، الساعة ${getRandomTime()}، يسدل الظلام ستائره على المدينة. هدوء مريب يسيطر على الأجواء، يكسره فقط دقات قلب الخائفين. القاتل يترصد، والشرطي يحاول فك رموز هذه الليلة...`
    ];
    return stories[Math.floor(Math.random() * stories.length)];
}

function getRandomDayName() {
    const days = ["الجمعة", "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
    return days[Math.floor(Math.random() * days.length)];
}

function getRandomTime() {
    const hours = Math.floor(Math.random() * 12) + 1; // 1-12
    const minutes = Math.floor(Math.random() * 60);
    const ampm = Math.random() < 0.5 ? "صباحاً" : "مساءً";
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
}
