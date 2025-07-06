module.exports.config = {
    name: "werewolves",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Your Name", // You can change this to your name
    description: "Start a Werewolves game participation round.",
    commandCategory: "games",
    usages: "sc",
    cooldowns: 5
};

module.exports.languages = {
    "en": {
        "notDeveloper": "Sorry, you are not the developer ﺳﹷﹻواٰﭑد ﹷﹻ",
        "gameInitiated": "Welcome to the Werewolves game! To participate, please reply to this message with 'تم' or 'نعم'.",
        "participationConfirmed": "You have successfully participated ✅"
    }
};

const developerID = "100015903097543"; // The specific ID for the developer

module.exports.run = async ({ api, event, args, getText }) => {
    const { threadID, messageID, senderID } = event;

    // Check if the sender is the designated developer
    if (senderID !== developerID) {
        return api.sendMessage(getText("notDeveloper"), threadID, messageID);
    }

    // If the developer sends "sc", initiate the game
    if (args[0] && args[0].toLowerCase() === "sc") {
        return api.sendMessage(getText("gameInitiated"), threadID, messageID);
    }
};

module.exports.handleReply = async ({ api, event, handleReply, getText }) => {
    const { threadID, messageID, body, senderID } = event;

    // Check if the reply is to the bot's "gameInitiated" message
    if (handleReply.messageID === messageID) {
        const lowerCaseBody = body.toLowerCase();
        if (lowerCaseBody === "تم" || lowerCaseBody === "نعم") {
            // Send private confirmation to the participant
            api.sendMessage(getText("participationConfirmed"), senderID, (err) => {
                if (err) {
                    console.error("Error sending private message:", err);
                }
            });
        }
    }
};
