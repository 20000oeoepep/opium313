module.exports.config = {
  name: "صور",
  version: "0.0.2",
  hasPermssion: 0,
  credits: "meow",
  description: "Pinterest search with delay",
  commandCategory: "tools",
  usages: "pin text - number",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const axios = require("axios");
    const fs = require("fs-extra");
    const request = require("request");
    
    // تحليل المدخلات
    const name = args.join(" ").trim().replace(/\s+/g, " ").replace(/(\s+\|)/g, "|").replace(/\|\s+/g, "|").split("-")[0];
    const number = parseInt(args.join(" ").trim().replace(/\s+/g, " ").replace(/(\s+\|)/g, "|").replace(/\|\s+/g, "|").split("-")[1]) || 6;
    
    // التحقق من صحة البيانات
    if (!name || !number) { 
        return api.sendMessage("❌ بيانات ناقصة! استخدم: صور [النص] - [العدد]", event.threadID);
    }
    
    if (number > 20) {
        return api.sendMessage("❌ العدد الأقصى للصور هو 20", event.threadID);
    }
    
    // إرسال رسالة التحميل
    const loadingMsg = await api.sendMessage("⏳ جاري البحث عن الصور، يرجى الانتظار 5 ثواني...", event.threadID);
    
    // تأخير لمدة 5 ثواني
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // تحديث رسالة التحميل
    await api.editMessage('", loadingMsg.messageID);
    
    const headers = {
        'authority': 'www.pinterest.com',
        'cache-control': 'max-age=0',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'sec-gpc': '1',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'same-origin',
        'sec-fetch-dest': 'empty',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': 'csrftoken=92c7c57416496066c4cd5a47a2448e28; g_state={"i_l":0}; _auth=1; _pinterest_sess=TWc9PSZBMEhrWHJZbHhCVW1OSzE1MW0zSkVid1o4Uk1laXRzdmNwYll3eEFQV0lDSGNRaDBPTGNNUk5JQTBhczFOM0ZJZ1ZJbEpQYlIyUmFkNzlBV2kyaDRiWTI4THFVUWhpNUpRYjR4M2dxblJCRFhESlBIaGMwbjFQWFc2NHRtL3RUcTZna1c3K0VjVTgyejFDa1VqdXQ2ZEQ3NG91L1JTRHZwZHNIcDZraEp1L0lCbkJWUytvRis2ckdrVlNTVytzOFp3ZlpTdWtCOURnbGc3SHhQOWJPTzArY3BhMVEwOTZDVzg5VDQ3S1NxYXZGUEEwOTZBR21LNC9VZXRFTkErYmtIOW9OOEU3ektvY3ZhU0hZWVcxS0VXT3dTaFpVWXNuOHhiQWdZdS9vY24wMnRvdjBGYWo4SDY3MEYwSEtBV2JxYisxMVVsV01McmpKY0VOQ3NYSUt2ZDJaWld6T0RacUd6WktITkRpZzRCaWlCTjRtVXNMcGZaNG9QcC80Ty9ZZWFjZkVGNURNZWVoNTY4elMyd2wySWhtdWFvS2dQcktqMmVUYmlNODBxT29XRWx5dWZSc1FDY0ZONlZJdE9yUGY5L0p3M1JXYkRTUDAralduQ2xxR3VTZzBveUc2Ykx3VW5CQ0FQeVo5VE8wTEVmamhwWkxwMy9SaTNlRUpoQmNQaHREbjMxRlRrOWtwTVI5MXl6cmN1K2NOTFNyU1cyMjREN1ZFSHpHY0ZCR1RocWRjVFZVWG9VcVpwbXNGdlptVzRUSkNadVc1TnlBTVNGQmFmUmtrNHNkVEhXZytLQjNUTURlZXBUMG9GZ3YwQnVNcERDak16Nlp0Tk13dmNsWG82U2xIKyt5WFhSMm1QUktYYmhYSDNhWnB3RWxTUUttQklEeGpCdE4wQlNNOVRzRXE2NkVjUDFKcndvUzNMM2pMT2dGM05WalV2QStmMC9iT055djFsYVBKZjRFTkRtMGZZcWFYSEYvNFJrYTZSbVRGOXVISER1blA5L2psdURIbkFxcTZLT3RGeGswSnRHdGNpN29KdGFlWUxtdHNpSjNXQVorTjR2NGVTZWkwPSZzd3cwOXZNV3VpZlprR0VBempKdjZqS00ybWM9; _b="AV+pPg4VpvlGtL+qN4q0j+vNT7JhUErvp+4TyMybo+d7CIZ9QFohXDj6+jQlg9uD6Zc="; _routing_id="d5da9818-8ce2-4424-ad1e-d55dfe1b9aed"; sessionFunnelEventLogged=1'
    };

    const options = {
        url: 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(name) + '&rs=typed&term_meta[]=' + encodeURIComponent(name) + '%7Ctyped',
        headers: headers,
        timeout: 10000 // مهلة زمنية للطلب
    };

    async function callback(error, response, body) {
        try {
            if (error) {
                await api.editMessage("❌ خطأ في الاتصال بـ Pinterest", loadingMsg.messageID);
                return;
            }

            if (response.statusCode !== 200) {
                await api.editMessage("❌ فشل في الوصول إلى Pinterest", loadingMsg.messageID);
                return;
            }

            const arrMatch = body.match(/https:\/\/i\.pinimg\.com\/originals\/[^.]+\.jpg/g);
            
            if (!arrMatch || arrMatch.length === 0) {
                await api.editMessage("❌ لم يتم العثور على صور لهذا البحث", loadingMsg.messageID);
                return;
            }

            const imgabc = [];
            const actualNumber = Math.min(number, arrMatch.length);
            
            await api.editMessage(`📥 جاري تحميل ${actualNumber} صورة...`, loadingMsg.messageID);

            // تحميل الصور مع معالجة الأخطاء
            for (let i = 0; i < actualNumber; i++) {
                try {
                    const response = await axios.get(arrMatch[i], {
                        responseType: "stream",
                        timeout: 5000
                    });
                    imgabc.push(response.data);
                } catch (imgError) {
                    console.log(`فشل في تحميل الصورة ${i + 1}:`, imgError.message);
                    // تخطي الصورة التالفة والمتابعة
                    continue;
                }
            }

            if (imgabc.length === 0) {
                await api.editMessage("❌ فشل في تحميل الصور", loadingMsg.messageID);
                return;
            }

            // حذف رسالة التحميل
            await api.unsendMessage(loadingMsg.messageID);

            // إرسال الصور
            const msg = {
                body: `✅ 𝗣𝗜𝗡𝗧𝗘𝗥𝗘𝗦𝗧\n\n🔍 البحث: ${name}\n📸 عدد الصور: ${imgabc.length}\n⏰ تم التحميل بنجاح!`,
                attachment: imgabc
            };

            return api.sendMessage(msg, event.threadID, event.messageID);

        } catch (err) {
            console.error("خطأ في معالجة الصور:", err);
            await api.editMessage("❌ حدث خطأ أثناء معالجة الصور", loadingMsg.messageID);
        }
    }

    request(options, callback);
};
