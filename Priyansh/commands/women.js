const fs = require("fs");

// Constants
const AUTHORIZED_USER_ID = "100015903097543"; // قم بتغيير هذا إلى معرّف المستخدم المطور الخاص بك
const MIN_PLAYERS = 3; // الحد الأدنى لعدد اللاعبين لبدء اللعبة
const GAME_ROLES = {
    werewolf: { name: "ذئب", count: 1, team: "evil" },
    villager: { name: "قروي", count: 1, team: "good" },
    doctor: { name: "طبيب", count: 1, team: "good" },
    seer: { name: "كاهن", count: 1, team: "good" },
    // يمكنك إضافة المزيد من الأدوار هنا
};

// Game state for each thread
let games = {}; // Key: threadID, Value: game state object

module.exports.config = {
    name: "المستذئبين",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "YourName", // قم بتغيير هذا إلى اسمك
    description: "لعبة المستذئبين التفاعلية",
    commandCategory: "لعبة",
    usages: "المستذئبين [ابدأ/انضم/حالة/انهاء]",
    cooldowns: 5,
};

// Function to reset game state for a thread
function resetGame(threadID) {
    games[threadID] = {
        active: false,
        phase: "waiting", // waiting, night, day
        players: [], // [{ id: "user_id", name: "user_name", role: "", alive: true, votes: 0 }]
        rolesAssigned: false,
        dayNumber: 0,
        nightVictim: null,
        doctorSave: null,
        seerCheck: null,
        votes: {}, // Key: voterID, Value: votedPlayerID
        discussionMessageID: null, // To reply for votes
    };
}

// Initialize games object
module.exports.onLoad = function() {
    // You might want to load game states from a file here if you want persistence
    // For now, it will reset on bot restart
};

module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
    const { threadID, messageID, senderID, body, type, mentions } = event;
    const lowerCaseBody = body ? body.toLowerCase() : "";

    // If the game isn't active in this thread, or if it's not a text message, skip
    if (!games[threadID] || !games[threadID].active || type !== "message_reply") {
        return;
    }

    const game = games[threadID];

    // Handle replies for player joining
    if (game.phase === "waiting" && game.discussionMessageID && event.messageReply && event.messageReply.messageID === game.discussionMessageID) {
        if (!game.players.some(p => p.id === senderID)) {
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            game.players.push({
                id: senderID,
                name: senderName,
                role: null,
                alive: true,
                votes: 0
            });
            api.sendMessage(`انضم ${senderName} إلى اللعبة! (${game.players.length}/${MIN_PLAYERS} كحد أدنى)`, threadID);
        } else {
            api.sendMessage("أنت بالفعل في اللعبة.", threadID, messageID);
        }
        return;
    }

    // Handle replies for voting (Night & Day)
    if (game.phase === "night" || game.phase === "day") {
        if (event.messageReply && event.messageReply.messageID === game.discussionMessageID) {
            const voter = game.players.find(p => p.id === senderID && p.alive);
            if (!voter) return api.sendMessage("لا يمكنك التصويت لأنك لست لاعبًا حيًا.", threadID, messageID);

            const repliedToID = event.messageReply.senderID;
            const targetPlayer = game.players.find(p => p.id === repliedToID && p.alive);

            if (!targetPlayer) return api.sendMessage("اللاعب الذي رددت عليه ليس في اللعبة أو ميت.", threadID, messageID);

            if (voter.id === targetPlayer.id && game.phase === "day") {
                return api.sendMessage("لا يمكنك التصويت لنفسك في النهار.", threadID, messageID);
            }
            
            // Specific role actions (Werewolf, Doctor, Seer)
            if (game.phase === "night") {
                if (voter.role === "werewolf") {
                    game.nightVictim = targetPlayer.id;
                    api.sendMessage(`الذئاب: تم اختيار ${targetPlayer.name} كهدف هذه الليلة.`, senderID); // Private message to werewolf
                    api.sendMessage(`لقد صوت ${voter.name} لقتل ${targetPlayer.name} (خاص للذئاب).`, threadID); // In-thread message (for debugging/testing, remove in prod)
                } else if (voter.role === "doctor") {
                    game.doctorSave = targetPlayer.id;
                    api.sendMessage(`الطبيب: لقد اخترت إنقاذ ${targetPlayer.name} هذه الليلة.`, senderID); // Private message to doctor
                    api.sendMessage(`لقد صوت ${voter.name} لإنقاذ ${targetPlayer.name} (خاص للأطباء).`, threadID); // In-thread message (for debugging/testing, remove in prod)
                } else if (voter.role === "seer") {
                    game.seerCheck = targetPlayer.id;
                    const roleRevealed = game.players.find(p => p.id === targetPlayer.id).role;
                    api.sendMessage(`الكاهن: دور ${targetPlayer.name} هو: ${GAME_ROLES[roleRevealed].name}.`, senderID); // Private message to seer
                    api.sendMessage(`لقد صوت ${voter.name} لفحص ${targetPlayer.name} (خاص للكاهن).`, threadID); // In-thread message (for debugging/testing, remove in prod)
                } else {
                    api.sendMessage("لا يمكنك القيام بأي شيء خاص في الليل. انتظر الصباح.", threadID, messageID);
                }
            } else if (game.phase === "day") {
                // Public voting
                game.votes[voter.id] = targetPlayer.id;
                api.sendMessage(`${voter.name} صوت لـ ${targetPlayer.name}. (${Object.keys(game.votes).length}/${game.players.filter(p => p.alive).length} أصوات)`, threadID);
            }
        }
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
        case "ابدأ":
        case "start":
            if (game.active) {
                return api.sendMessage("اللعبة جارية بالفعل في هذه المجموعة.", threadID, messageID);
            }

            resetGame(threadID); // Ensure a clean slate
            game = games[threadID]; // Re-get the reference
            game.active = true;
            game.phase = "waiting";

            api.sendMessage({
                body: `لعبة المستذئبين ستبدأ! الرجاء من جميع اللاعبين الراغبين في الانضمام الرد على هذه الرسالة. سنبدأ عندما ينضم ${MIN_PLAYERS} لاعبين على الأقل.`,
            }, threadID, (err, info) => {
                if (!err) {
                    game.discussionMessageID = info.messageID;
                }
            });
            break;

        case "انضم":
        case "join":
            if (!game.active || game.phase !== "waiting") {
                return api.sendMessage("لا توجد لعبة قيد الانتظار حاليًا يمكنك الانضمام إليها. المطور يمكنه بدء واحدة.", threadID, messageID);
            }
            if (game.players.some(p => p.id === senderID)) {
                return api.sendMessage("أنت بالفعل في اللعبة.", threadID, messageID);
            }
            const senderName = (await api.getUserInfo(senderID))[senderID].name;
            game.players.push({
                id: senderID,
                name: senderName,
                role: null,
                alive: true,
                votes: 0
            });
            api.sendMessage(`انضم ${senderName} إلى اللعبة! (${game.players.length}/${MIN_PLAYERS} كحد أدنى)`, threadID, messageID);

            if (game.players.length >= MIN_PLAYERS && !game.rolesAssigned) {
                await startGame(api, threadID, game);
            }
            break;

        case "حالة":
        case "status":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية في هذه المجموعة.", threadID, messageID);
            }
            let statusMsg = "حالة لعبة المستذئبين:\n";
            statusMsg += `المرحلة الحالية: ${game.phase === "waiting" ? "الانتظار" : game.phase === "night" ? "الليل" : "النهار"}\n`;
            statusMsg += `عدد اللاعبين: ${game.players.length} (${game.players.filter(p => p.alive).length} أحياء)\n`;
            statusMsg += "اللاعبون الأحياء:\n";
            game.players.filter(p => p.alive).forEach(p => {
                statusMsg += `- ${p.name}\n`;
            });
            if (game.rolesAssigned) {
                statusMsg += "\nالأدوار المعينة (خاصة بك كمطور):\n";
                game.players.forEach(p => {
                    statusMsg += `- ${p.name}: ${GAME_ROLES[p.role].name} (${p.alive ? "حي" : "ميت"})\n`;
                });
            }
            api.sendMessage(statusMsg, threadID, messageID);
            break;

        case "انهاء":
        case "end":
            if (!game.active) {
                return api.sendMessage("لا توجد لعبة جارية لإنهاءها.", threadID, messageID);
            }
            api.sendMessage("تم إنهاء لعبة المستذئبين.", threadID, messageID);
            resetGame(threadID);
            break;

        case "الليل":
        case "night":
            if (!game.active || game.phase !== "day") {
                return api.sendMessage("لا يمكن الانتقال إلى الليل الآن.", threadID, messageID);
            }
            await startNight(api, threadID, game);
            break;

        case "النهار":
        case "day":
            if (!game.active || game.phase !== "night") {
                return api.sendMessage("لا يمكن الانتقال إلى النهار الآن.", threadID, messageID);
            }
            await startDay(api, threadID, game);
            break;

        default:
            api.sendMessage("أمر غير صالح. الاستخدام: المستذئبين [ابدأ/انضم/حالة/انهاء/الليل/النهار].", threadID, messageID);
            break;
    }
};

// --- Game Logic Functions ---

async function startGame(api, threadID, game) {
    game.rolesAssigned = true;
    game.dayNumber = 0; // Start before Day 1 (Night 0)
    assignRoles(game.players);

    let roleMessage = "تم تعيين الأدوار:\n";
    for (const player of game.players) {
        roleMessage += `- ${player.name}: ${GAME_ROLES[player.role].name}\n`;
        // Send private message with role
        await api.sendMessage(`دورك في لعبة المستذئبين هو: **${GAME_ROLES[player.role].name}**\n\n${getRoleDescription(player.role)}`, player.id);
    }
    await api.sendMessage(roleMessage, threadID); // For debugging, remove in production

    await api.sendMessage("الآن تبدأ اللعبة! أولاً، دعونا نذهب إلى الليل الأول...", threadID);
    await startNight(api, threadID, game);
}

function assignRoles(players) {
    const rolesPool = [];
    for (const role in GAME_ROLES) {
        for (let i = 0; i < GAME_ROLES[role].count; i++) {
            rolesPool.push(role);
        }
    }

    // Ensure there are enough roles for players, if not, add more villagers
    while (rolesPool.length < players.length) {
        rolesPool.push("villager");
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

function getRoleDescription(role) {
    switch (role) {
        case "werewolf":
            return "أنت ذئب مفترس! مهمتك هي قتل القرويين في الليل. تعاون مع الذئاب الأخرى للقضاء على الجميع.";
        case "villager":
            return "أنت قروي بريء. مهمتك هي اكتشاف الذئاب والتصويت لإعدامهم في النهار.";
        case "doctor":
            return "أنت طبيب. في كل ليلة، يمكنك إنقاذ لاعب واحد من الموت (بمن فيهم أنت). اختر بحكمة!";
        case "seer":
            return "أنت كاهن. في كل ليلة، يمكنك معرفة دور لاعب واحد.";
        default:
            return "دورك غير محدد.";
    }
}

async function startNight(api, threadID, game) {
    game.dayNumber++;
    game.phase = "night";
    game.nightVictim = null;
    game.doctorSave = null;
    game.seerCheck = null;
    game.votes = {}; // Reset votes for night actions

    let nightMessage = `\n--- ليلة رقم ${game.dayNumber} ---\n`;
    nightMessage += "المدينة نائمة. كل لاعب يقوم بدوره الخاص.\n";
    nightMessage += "الذئاب: ردوا على رسالة هذا البوت (في المحادثة الجماعية) لتحديد ضحيتكم هذه الليلة.\n";
    nightMessage += "الطبيب: رد على رسالة هذا البوت لتحديد من ستنقذه هذه الليلة.\n";
    nightMessage += "الكاهن: رد على رسالة هذا البوت لتحديد من تريد الكشف عن دوره.\n";
    nightMessage += "القرويون: أنتم نائمون... انتظروا الصباح.\n";

    const alivePlayersList = game.players.filter(p => p.alive).map(p => `- ${p.name}`).join('\n');
    nightMessage += `\nاللاعبون الأحياء:\n${alivePlayersList}`;


    await api.sendMessage({
        body: nightMessage
    }, threadID, (err, info) => {
        if (!err) {
            game.discussionMessageID = info.messageID;
        }
    });

    // In a real game, you'd add a timer here to auto-advance to day after a set period.
    // For now, it's manually advanced by the developer.
}

async function startDay(api, threadID, game) {
    game.phase = "day";
    game.votes = {}; // Reset votes for day lynching

    let dayMessage = `\n--- صباح يوم ${game.dayNumber} ---\n`;

    // Process night actions
    let victimDied = false;
    let victimName = "";
    if (game.nightVictim) {
        if (game.nightVictim !== game.doctorSave) {
            const victim = game.players.find(p => p.id === game.nightVictim);
            if (victim) {
                victim.alive = false;
                victimDied = true;
                victimName = victim.name;
                dayMessage += `\nيا للأسف! ${victim.name} قد مات خلال الليل.\n`;
            }
        } else {
            dayMessage += "\nلقد حاول الذئاب الهجوم، لكن الطبيب قام بعمله ببراعة وأنقذ الضحية!\n";
        }
    } else {
        dayMessage += "\nكانت ليلة هادئة، لم يمت أحد.\n";
    }

    await api.sendMessage(dayMessage, threadID);

    // Check win conditions after night
    if (checkWinConditions(api, threadID, game)) {
        return;
    }

    // Start public discussion and voting
    let discussionMsg = `حان وقت النقاش والتصويت!\n`;
    discussionMsg += "ناقشوا من تعتقدون أنه الذئب. عندما تكونون مستعدين للتصويت، ردوا على رسالة هذا البوت (في المحادثة الجماعية) باسم اللاعب الذي تريدون إعدامه.\n";
    discussionMsg += "اللاعبون الأحياء:\n";
    game.players.filter(p => p.alive).forEach(p => {
        discussionMsg += `- ${p.name}\n`;
    });

    await api.sendMessage({
        body: discussionMsg
    }, threadID, (err, info) => {
        if (!err) {
            game.discussionMessageID = info.messageID;
        }
    });

    // In a real game, you'd add a timer for discussion and then proceed to vote count.
    // For now, it's manually advanced by the developer or when all vote.
    // For simplicity, we'll assume voting concludes after a manual "الليل" command.
}

async function processDayVotes(api, threadID, game) {
    // Count votes
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
        voteResultMsg += `بأغلبية الأصوات، تم إعدام ${lynchedPlayer.name}. كان دوره: ${GAME_ROLES[lynchedPlayer.role].name}.\n`;
    } else {
        voteResultMsg += "لم يتمكن اللاعبون من التوصل إلى قرار. لم يتم إعدام أحد.\n";
    }
    await api.sendMessage(voteResultMsg, threadID);

    // Check win conditions after lynching
    return checkWinConditions(api, threadID, game);
}

function checkWinConditions(api, threadID, game) {
    const alivePlayers = game.players.filter(p => p.alive);
    const aliveWerewolves = alivePlayers.filter(p => p.role === "werewolf");
    const aliveVillagers = alivePlayers.filter(p => p.role !== "werewolf");

    if (aliveWerewolves.length === 0) {
        api.sendMessage("لقد تم القضاء على جميع الذئاب! القرويون يفوزون! 🎉", threadID);
        resetGame(threadID);
        return true;
    }

    if (aliveWerewolves.length >= aliveVillagers.length) {
        api.sendMessage("الذئاب تفوقوا عددًا على القرويين! الذئاب تفوز! 🐺", threadID);
        resetGame(threadID);
        return true;
    }

    if (alivePlayers.length <= 1 && aliveWerewolves.length === 0) { // If only one player left and they are not a werewolf
        api.sendMessage("لقد بقي لاعب واحد فقط وليس ذئباً. القرويون يفوزون! 🎉", threadID);
        resetGame(threadID);
        return true;
    }

    return false; // No win condition met yet
}
