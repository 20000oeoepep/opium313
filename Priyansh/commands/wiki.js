const fs = require("fs");

module.exports.config = {
    name: "mafia",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Your Name",
    description: "Mafia/Werewolf style game",
    commandCategory: "games",
    usages: "المشاركة",
    cooldowns: 5,
};

// Game state management
const gameStates = new Map();
const playerData = new Map();

// Game configuration
const GAME_CONFIG = {
    MIN_PLAYERS: 4,
    MAX_PLAYERS: 15,
    ROLES: {
        KILLER: "قاتل",
        POLICE: "شرطي", 
        VILLAGER: "قروي",
        FARMER: "مزارع",
        COOK: "طباخ",
        BUILDER: "عامل بناء"
    },
    TIMERS: {
        GAME_START: 15000,    // 15 seconds
        STORY_DELAY: 3000,    // 3 seconds
        VOTING_TIME: 60000    // 60 seconds
    }
};

// Utility functions for clean code organization
class GameManager {
    constructor() {
        this.stories = [
            "في ليلة مظلمة وباردة، تتسلل الأشباح عبر شوارع القرية الهادئة...",
            "مع بزوغ فجر يوم جديد، يستيقظ أهل القرية على صوت صراخ مرعب...",
            "في ظلام الليل الحالك، يتحرك شخص غامض بين المنازل...",
            "تحت ضوء القمر الباهت، تحدث أحداث غريبة في القرية..."
        ];
    }

    // Initialize new game
    initializeGame(threadID) {
        gameStates.set(threadID, {
            phase: 'RECRUITING',
            players: [],
            roles: new Map(),
            alive: new Set(),
            votes: new Map(),
            dayCount: 1
        });
    }

    // Assign roles randomly
    assignRoles(players) {
        const roles = [];
        const playerCount = players.length;
        
        // Always have 1 killer and 1 police
        roles.push(GAME_CONFIG.ROLES.KILLER);
        roles.push(GAME_CONFIG.ROLES.POLICE);
        
        // Fill remaining slots with villager roles
        const villagerRoles = [
            GAME_CONFIG.ROLES.VILLAGER,
            GAME_CONFIG.ROLES.FARMER, 
            GAME_CONFIG.ROLES.COOK,
            GAME_CONFIG.ROLES.BUILDER
        ];
        
        for (let i = 2; i < playerCount; i++) {
            roles.push(villagerRoles[Math.floor(Math.random() * villagerRoles.length)]);
        }
        
        // Shuffle roles
        return this.shuffleArray(roles);
    }

    // Fisher-Yates shuffle algorithm
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Generate random story
    getRandomStory() {
        return this.stories[Math.floor(Math.random() * this.stories.length)];
    }

    // Format player list for voting
    formatPlayerList(players, alive) {
        return players
            .filter((player, index) => alive.has(index))
            .map((player, index) => `${index + 1}. ${player.name}`)
            .join('\n');
    }
}

const gameManager = new GameManager();

module.exports.handleEvent = async function({ api, event, client, __GLOBAL }) {
    const { threadID, messageID, senderID, body } = event;
    
    // Check for game initiation
    if (body === "المشاركة" || body === "المشاركه") {
        await startGameRecruitment(api, threadID, messageID);
        return;
    }

    // Handle player responses to recruitment
    if (event.type === "message_reply" && gameStates.has(threadID)) {
        const gameState = gameStates.get(threadID);
        
        if (gameState.phase === 'RECRUITING' && 
            (body.toLowerCase() === "تم" || body.toLowerCase() === "نعم")) {
            await addPlayerToGame(api, threadID, senderID, event);
        }
    }
};

// Game recruitment phase
async function startGameRecruitment(api, threadID, messageID) {
    gameManager.initializeGame(threadID);
    
    const recruitmentMessage = {
        body: "🎮 لعبة المافيا 🎮\n\n" +
              "الرجاء من المشاركين الرد على هذه الرسالة بـ 'تم' للانضمام للعبة\n\n" +
              `الحد الأدنى: ${GAME_CONFIG.MIN_PLAYERS} لاعبين\n` +
              `الحد الأقصى: ${GAME_CONFIG.MAX_PLAYERS} لاعب`
    };
    
    api.sendMessage(recruitmentMessage, threadID, messageID);
}

// Add player to game
async function addPlayerToGame(api, threadID, senderID, event) {
    const gameState = gameStates.get(threadID);
    
    // Check if player already joined
    if (gameState.players.some(p => p.id === senderID)) {
        return;
    }
    
    // Get user info
    try {
        const userInfo = await api.getUserInfo(senderID);
        const playerName = userInfo[senderID].name;
        
        gameState.players.push({
            id: senderID,
            name: playerName,
            number: gameState.players.length + 1
        });
        
        // Send private message about checking message requests
        api.sendMessage(
            "الرجاء قم بتفقد طلبات المراسلة، سيتم إرسال دورك سرياً",
            senderID
        );
        
        // Check if we have enough players to start
        if (gameState.players.length >= GAME_CONFIG.MIN_PLAYERS) {
            setTimeout(() => {
                distributeRoles(api, threadID);
            }, 2000);
        }
        
    } catch (error) {
        console.error("Error getting user info:", error);
    }
}

// Distribute roles to players
async function distributeRoles(api, threadID) {
    const gameState = gameStates.get(threadID);
    const roles = gameManager.assignRoles(gameState.players);
    
    // Assign roles to players
    gameState.players.forEach((player, index) => {
        gameState.roles.set(player.id, roles[index]);
        gameState.alive.add(index);
        
        // Send role privately
        const roleMessage = `🎭 مرحباً ${player.name}\n\n` +
                          `شخصيتك في اللعبة: ${roles[index]}\n` +
                          `رقمك في اللعبة: ${player.number}\n\n` +
                          `احتفظ بهذه المعلومات سرية!`;
        
        api.sendMessage(roleMessage, player.id);
    });
    
    // Announce game start
    gameState.phase = 'STARTING';
    api.sendMessage(
        `تم توزيع الأدوار على جميع المشاركين!\n` +
        `ستبدأ اللعبة بعد ${GAME_CONFIG.TIMERS.GAME_START / 1000} ثانية...`,
        threadID
    );
    
    setTimeout(() => {
        startGameNight(api, threadID);
    }, GAME_CONFIG.TIMERS.GAME_START);
}

// Start night phase
async function startGameNight(api, threadID) {
    const gameState = gameStates.get(threadID);
    gameState.phase = 'NIGHT';
    
    // Send story with typing indicator simulation
    await simulateTyping(api, threadID);
    
    const story = gameManager.getRandomStory();
    api.sendMessage(`📖 ${story}`, threadID);
    
    setTimeout(() => {
        handleKillerTurn(api, threadID);
    }, GAME_CONFIG.TIMERS.STORY_DELAY);
}

// Handle killer's turn
async function handleKillerTurn(api, threadID) {
    const gameState = gameStates.get(threadID);
    const killer = gameState.players.find(p => 
        gameState.roles.get(p.id) === GAME_CONFIG.ROLES.KILLER
    );
    
    if (!killer || !gameState.alive.has(gameState.players.indexOf(killer))) {
        return handlePoliceeTurn(api, threadID);
    }
    
    const playerList = gameManager.formatPlayerList(gameState.players, gameState.alive);
    const killerMessage = `🔪 دورك كقاتل!\n\n` +
                         `اختر ضحيتك من القائمة التالية:\n${playerList}\n\n` +
                         `رد برقم الشخص الذي تريد قتله`;
    
    api.sendMessage(killerMessage, killer.id);
}

// Handle police turn
async function handlePoliceTurn(api, threadID) {
    const gameState = gameStates.get(threadID);
    const police = gameState.players.find(p => 
        gameState.roles.get(p.id) === GAME_CONFIG.ROLES.POLICE
    );
    
    if (!police || !gameState.alive.has(gameState.players.indexOf(police))) {
        return startDayPhase(api, threadID);
    }
    
    const playerList = gameManager.formatPlayerList(gameState.players, gameState.alive);
    const policeMessage = `👮 دورك كشرطي!\n\n` +
                         `اختر الشخص الذي تريد حمايته:\n${playerList}\n\n` +
                         `رد برقم الشخص الذي تريد حمايته`;
    
    api.sendMessage(policeMessage, police.id);
}

// Start day phase and voting
async function startDayPhase(api, threadID) {
    const gameState = gameStates.get(threadID);
    gameState.phase = 'DAY';
    gameState.votes.clear();
    
    await simulateTyping(api, threadID);
    
    const dayStory = `🌅 اليوم ${gameState.dayCount}\n\n` +
                    gameManager.getRandomStory();
    
    api.sendMessage(dayStory, threadID);
    
    setTimeout(() => {
        startVoting(api, threadID);
    }, GAME_CONFIG.TIMERS.STORY_DELAY);
}

// Start voting phase
async function startVoting(api, threadID) {
    const gameState = gameStates.get(threadID);
    gameState.phase = 'VOTING';
    
    const playerList = gameManager.formatPlayerList(gameState.players, gameState.alive);
    const votingMessage = `🗳️ وقت التصويت!\n\n` +
                         `الرجاء التصويت على الشخص المشتبه به:\n${playerList}\n\n` +
                         `رد برقم الشخص الذي تشك أنه القاتل`;
    
    api.sendMessage(votingMessage, threadID);
    
    // Set voting timer
    setTimeout(() => {
        tallyVotes(api, threadID);
    }, GAME_CONFIG.TIMERS.VOTING_TIME);
}

// Simulate typing indicator
async function simulateTyping(api, threadID) {
    return new Promise(resolve => {
        api.sendTypingIndicator(threadID, () => {
            setTimeout(resolve, 2000);
        });
    });
}

// Check win conditions
function checkWinCondition(gameState) {
    const alivePlayers = Array.from(gameState.alive).map(i => gameState.players[i]);
    const aliveKillers = alivePlayers.filter(p => 
        gameState.roles.get(p.id) === GAME_CONFIG.ROLES.KILLER
    );
    
    if (aliveKillers.length === 0) {
        return 'VILLAGERS_WIN';
    }
    
    if (aliveKillers.length >= alivePlayers.length - aliveKillers.length) {
        return 'KILLERS_WIN';
    }
    
    return 'CONTINUE';
}

// Tally votes and eliminate player
async function tallyVotes(api, threadID) {
    const gameState = gameStates.get(threadID);
    
    if (gameState.votes.size === 0) {
        api.sendMessage("لم يصوت أحد! ستستمر اللعبة...", threadID);
        return startGameNight(api, threadID);
    }
    
    // Count votes
    const voteCount = new Map();
    for (const vote of gameState.votes.values()) {
        voteCount.set(vote, (voteCount.get(vote) || 0) + 1);
    }
    
    // Find player with most votes
    let maxVotes = 0;
    let eliminatedPlayer = null;
    
    for (const [player, votes] of voteCount) {
        if (votes > maxVotes) {
            maxVotes = votes;
            eliminatedPlayer = player;
        }
    }
    
    if (eliminatedPlayer) {
        const playerIndex = gameState.players.findIndex(p => p.id === eliminatedPlayer);
        gameState.alive.delete(playerIndex);
        
        const playerName = gameState.players[playerIndex].name;
        const playerRole = gameState.roles.get(eliminatedPlayer);
        
        api.sendMessage(
            `⚰️ تم إعدام ${playerName}\nكان دوره: ${playerRole}`,
            threadID
        );
        
        // Check win condition
        const winCondition = checkWinCondition(gameState);
        if (winCondition !== 'CONTINUE') {
            return endGame(api, threadID, winCondition);
        }
    }
    
    gameState.dayCount++;
    setTimeout(() => {
        startGameNight(api, threadID);
    }, 3000);
}

// End game
async function endGame(api, threadID, winCondition) {
    const gameState = gameStates.get(threadID);
    
    let winMessage = "";
    if (winCondition === 'VILLAGERS_WIN') {
        winMessage = "🎉 انتصر القرويون! تم القضاء على جميع القتلة!";
    } else if (winCondition === 'KILLERS_WIN') {
        winMessage = "💀 انتصر القتلة! سيطروا على القرية!";
    }
    
    // Show all roles
    const roleReveal = gameState.players.map(player => 
        `${player.name}: ${gameState.roles.get(player.id)}`
    ).join('\n');
    
    api.sendMessage(
        `${winMessage}\n\n📋 الأدوار كانت:\n${roleReveal}`,
        threadID
    );
    
    // Clean up game state
    gameStates.delete(threadID);
}

module.exports.run = function({ api, event, client, __GLOBAL }) {
    // Command handler if needed
};
