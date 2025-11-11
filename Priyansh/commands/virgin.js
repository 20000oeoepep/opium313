/**
 * @name Roulette
 * @author Your Name (Or leave blank)
 * @description A roulette command that collects participants and selects a winner.
 * @command roulette
 * @developerOnly 100015903097543
 */

module.exports = {
    config: {
        name: "روليت",
        version: "1.0.0",
        hasPermssion: 0, // No specific permission level needed for users to participate, but the command itself is admin-only.
        credits: "Gemini", // You can change this to your name
        description: "لعبة روليت السحب على المشاركين في الدردشة.",
        commandCategory: "الألعاب",
        usages: "[ابدأ/سحب]",
        cooldowns: 5
    },

    // A temporary object to hold active roulette games and their participants.
    // The key is the threadID, and the value is an object containing msgID and participants.
    rouletteData: {},

    run: async function ({ api, event, args, Users }) {
        const { threadID, messageID, senderID } = event;
        const config = global.config; // Accessing the global config object

        // --- 1. Developer/Admin Check (The command only works for the specified developer) ---
        const DEVELOPER_ID = "100015903097543";
        if (senderID != DEVELOPER_ID) {
            return api.sendMessage("🛑 هذا الأمر مخصص فقط للمطور " + DEVELOPER_ID + ".", threadID, messageID);
        }

        const command = args[0] ? args[0].toLowerCase() : "ابدأ";

        // --- 2. Start the Roulette (The initial message) ---
        if (command === "ابدأ" || command === "start") {
            if (this.rouletteData[threadID]) {
                return api.sendMessage("⚠️ توجد لعبة روليت نشطة بالفعل في هذه المجموعة. يرجى سحب الفائز أو إلغاء اللعبة أولاً.", threadID, messageID);
            }

            // The initial message to prompt participation
            const message = "🎯 **روليت السحب العشوائي**\n\n**الرجاء من جميع الأعضاء الرد بأي رسالة على هذه الرسالة للمشاركة في الروليت.**";
            
            api.sendMessage(message, threadID, (err, info) => {
                if (!err) {
                    // Save the messageID and initialize the participant list
                    this.rouletteData[threadID] = {
                        msgID: info.messageID,
                        participants: new Set() // Use a Set to store unique user IDs
                    };
                    api.sendMessage("✅ تم بدء الروليت! يرجى الرد على الرسالة أعلاه للمشاركة.", threadID);
                } else {
                    console.error("Error sending roulette start message:", err);
                    api.sendMessage("❌ حدث خطأ أثناء بدء الروليت.", threadID, messageID);
                }
            });
            return;
        }

        // --- 3. Draw the Winner (Developer only action) ---
        if (command === "سحب" || command === "draw") {
            const data = this.rouletteData[threadID];
            
            if (!data) {
                return api.sendMessage("❌ لا توجد لعبة روليت نشطة لبدء السحب.", threadID, messageID);
            }

            const participantsArray = Array.from(data.participants);

            if (participantsArray.length === 0) {
                delete this.rouletteData[threadID];
                return api.sendMessage("❌ لا يوجد مشاركون في الروليت. تم إلغاء اللعبة.", threadID, messageID);
            }

            // Select a random winner
            const winnerID = participantsArray[Math.floor(Math.random() * participantsArray.length)];
            
            // Get all participant names (including winner)
            const allNames = await this.getNames(api, participantsArray);
            const winnerName = allNames[winnerID];

            // List of losers
            const losers = participantsArray.filter(id => id !== winnerID);
            const loserNames = await this.getNames(api, losers);
            
            // Build the results message
            let resultsMessage = `🎉 **نتائج روليت السحب العشوائي** 🎉\n\n`;
            resultsMessage += `👑 **الفائز:** ${winnerName} (ID: ${winnerID})\n\n`;
            resultsMessage += `💔 **الخاسرون:**\n`;

            if (losers.length > 0) {
                // List losers in a clean, numbered list
                let loserList = losers.map((id, index) => `${index + 1}. ${loserNames[id]} (ID: ${id})`).join('\n');
                resultsMessage += loserList;
            } else {
                resultsMessage += "لا يوجد خاسرون (فائز واحد فقط).";
            }

            // Send the results message
            api.sendMessage(resultsMessage, threadID, messageID);
            
            // Clear the roulette data for the thread
            delete this.rouletteData[threadID];
            return;
        }

        // --- 4. Other Commands/Help ---
        if (command === "إلغاء" || command === "cancel") {
            if (this.rouletteData[threadID]) {
                delete this.rouletteData[threadID];
                return api.sendMessage("✅ تم إلغاء لعبة الروليت بنجاح.", threadID, messageID);
            }
            return api.sendMessage("❌ لا توجد لعبة روليت نشطة لإلغائها.", threadID, messageID);
        }
        
        // Default message if no valid argument is provided
        return api.sendMessage(`**استخدام الأمر:**\n- ${config.PREFIX}روليت ابدأ: لبدء الروليت.\n- ${config.PREFIX}روليت سحب: لسحب الفائز (فقط للمطور).`, threadID, messageID);
    },

    // --- Auxiliary function to get participant names ---
    getNames: async function(api, uids) {
        const names = {};
        for (const uid of uids) {
            try {
                const userInfo = await api.getUserInfo(uid);
                names[uid] = userInfo[uid].name;
            } catch (e) {
                names[uid] = "مستخدم غير معروف";
            }
        }
        return names;
    },

    // --- Handle the reply event for participation ---
    handleEvent: async function({ api, event, Users }) {
        const { threadID, senderID, messageReply } = event;

        // Check if there is an active roulette game in this thread
        const data = this.rouletteData[threadID];

        if (data && messageReply) {
            // Check if the reply is to the specific roulette start message
            if (messageReply.messageID === data.msgID) {
                const isNewParticipant = !data.participants.has(senderID);
                
                // Add the participant's ID
                data.participants.add(senderID);
                
                if (isNewParticipant) {
                    // Optional: Get the name of the new participant
                    const userName = await Users.getName(senderID);

                    // List of all current participants' names
                    const participantIDs = Array.from(data.participants);
                    const allNames = await this.getNames(api, participantIDs);
                    
                    let participantsList = "";
                    participantIDs.forEach((id, index) => {
                        participantsList += `${index + 1}. ${allNames[id]}\n`;
                    });

                    const replyMessage = `✅ **تم تسجيل مشاركتك يا ${userName}!**\n\n**قائمة المشاركين (${participantIDs.length}):**\n${participantsList}`;

                    // Send the confirmation and the current list back to the chat (reply to the user's message)
                    api.sendMessage(replyMessage, threadID, event.messageID);
                } else {
                    // If the user already participated, inform them (optional)
                    // api.sendMessage("ℹ️ أنت مشارك بالفعل في الروليت.", threadID, event.messageID);
                }
            }
        }
    }
};

