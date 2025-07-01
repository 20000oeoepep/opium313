module.exports.config = {
  name: "صور",
  version: "0.0.1",
  hasPermssion: 0,
  credits: "meow",
  description: "Pinterest search",
  commandCategory: "tools",
  usages: "pin text - number",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
    const axios = require("axios");
    const fs = require("fs-extra");
    const request = require("request");

    const name = args.join(" ").trim().replace(/\s+/g, " ").replace(/(\s+\|)/g, "|").replace(/\|\s+/g, "|").split("-")[0];
    const number = args.join(" ").trim().replace(/\s+/g, " ").replace(/(\s+\|)/g, "|").replace(/\|\s+/g, "|").split("-")[1] || 6;
    if (!name || !number) { 
        return api.sendMessage("Missing Data", event.threadID);
    }

    var headers = {
        'authority': 'www.pinterest.com',
        'cache-control': 'max-age=0',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': 'csrftoken=92c7c57416496066c4cd5a47a2448e28; ...' // truncated for brevity
    };

    var options = {
        url: 'https://www.pinterest.com/search/pins/?q=' + (encodeURIComponent(name)) + '&rs=typed&term_meta[]=' + (encodeURIComponent(name)) + '%7Ctyped',
        headers: headers
    };

    async function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            const arrMatch = body.match(/https:\/\/i\.pinimg\.com\/originals\/[^.]+\.jpg/g);
            const imgabc = [];

            // Delay for 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));

            for (let i = 0; i < Math.min(number, arrMatch.length); i++) {
                const t = await axios.get(`${arrMatch[i]}`, {
                    responseType: "stream"
                });
                const o = t.data;
                imgabc.push(o);
            }

            var msg = {
                body: `► 𝗣𝗜𝗡𝗧𝗘𝗥𝗘𝗦𝗧\n\n${name} - ${number}`,
                attachment: imgabc
            };
            return api.sendMessage(msg, event.threadID, event.messageID);
        }
    }

    request(options, callback);
}
