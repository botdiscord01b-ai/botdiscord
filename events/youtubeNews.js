const Parser = require('rss-parser');
const parser = new Parser({
    customFields: {
        item: [
            ['media:group', 'mediaGroup']
        ]
    }
});

const TARGET_CHANNEL_ID = '1546974845244416070';
const CHECK_INTERVAL = 15 * 60 * 1000; // ตรวจสอบอัตโนมัติทุกๆ 15 นาที

const YOUTUBE_CHANNELS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS (TH)',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkIfBfDe9YeSp6ZZVyhjC5Q',
        fallbackLink: 'https://www.youtube.com/@PUBG_TH'
    },
    abi: {
        name: 'Arena Breakout: Infinite',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4p7wn-3DHpKk_9hxftr0ag',
        fallbackLink: 'https://www.youtube.com/channel/UC4p7wn-3DHpKk_9hxftr0ag'
    },
    scum: {
        name: 'SCUM Game Official',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCri5b4gBVVNQr5axQ8nPHCQ',
        fallbackLink: 'https://www.youtube.com/@SCUMGameOfficial'
    },
    valorant: {
        name: 'VALORANT',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNcpe0OrmnOHIUB33bVFbfQ',
        fallbackLink: 'https://www.youtube.com/@VALORANT'
    },
    cs2: {
        name: 'Counter-Strike 2',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC247Fi1BtjfvurRjMX1J48Q',
        fallbackLink: 'https://www.youtube.com/channel/UC247Fi1BtjfvurRjMX1J48Q'
    }
};

module.exports = {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log('🌐 ระบบติดตามข่าวสาร YouTube (แยกแยะคลิป/ไลฟ์) พร้อมทำงานแล้ว');

        // ตรวจสอบอัตโนมัติทุกๆ 15 นาที
        setInterval(async () => {
            const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID);
            if (!targetChannel) return;

            console.log('[YouTubeAuto] กำลังตรวจสอบคลิป/ไลฟ์สดใหม่จากทุกช่อง...');
            for (const key in YOUTUBE_CHANNELS) {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS[key], false);
            }
        }, CHECK_INTERVAL);

        // ฟังคำสั่งพิมพ์ !youtube หรือ !yt
        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            if (message.content.startsWith('!youtube') || message.content.startsWith('!yt')) {
                console.log(`[YouTubeNews] คำสั่งถูกเรียกใช้โดย: ${message.author.tag}`);
                
                const args = message.content.split(' ');
                const targetGame = args[1] ? args[1].toLowerCase() : 'all';
                const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID);

                if (!targetChannel) {
                    return message.reply(`❌ ไม่พบห้องเป้าหมาย (Channel ID: ${TARGET_CHANNEL_ID})`);
                }

                if (targetGame === 'pubg' || targetGame === 'all') await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.pubg, true);
                if (targetGame === 'abi' || targetGame === 'all') await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.abi, true);
                if (targetGame === 'scum' || targetGame === 'all') await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.scum, true);
                if (targetGame === 'valorant' || targetGame === 'val' || targetGame === 'all') await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.valorant, true);
                if (targetGame === 'cs2' || targetGame === 'counter' || targetGame === 'all') await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.cs2, true);

                if (message.channel.id !== TARGET_CHANNEL_ID) {
                    await message.reply(`✅ ดึงวิดีโอ/ไลฟ์สดล่าสุดเรียบร้อยแล้ว!`);
                }
            }
        });
    }
};

async function fetchAndSendLatestVideo(channel, game, isManualTrigger) {
    try {
        const feed = await parser.parseURL(game.feedUrl);
        if (!feed.items || feed.items.length === 0) return;

        const latestVideo = feed.items[0];
        const videoTitle = latestVideo.title;
        const videoLink = latestVideo.link;

        const videoIdMatch = videoLink.match(/(?:v=|\/v\/|embed\/|youtu\.be\/)([^&?/\s]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : videoLink;

        // 🔍 ตรวจสอบว่าเป็น "ไลฟ์สด (Live Stream)" หรือ "คลิปวิดีโอปกติ"
        const isLive = checkIfLive(latestVideo);

        // ดึงข้อความ 50 ข้อความล่าสุดในห้อง
        const messages = await channel.messages.fetch({ limit: 50 });
        
        // ตรวจดูว่ามีวิดีโอนี้โพสต์ไปแล้วหรือยัง
        const alreadyPosted = messages.some(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes(videoId)
        );

        if (!isManualTrigger && alreadyPosted) return;

        if (isManualTrigger && alreadyPosted) {
            const duplicateMessages = messages.filter(msg => 
                msg.author.id === channel.client.user.id && 
                msg.content.includes(videoId)
            );
            for (const [, oldMsg] of duplicateMessages) {
                await oldMsg.delete().catch(() => {});
            }
        }

        // 📢 รูปแบบการส่งข้อความแบ่งตามประเภท
        let messageText = '';
        if (isLive) {
            messageText = `🔴 **กำลังไลฟ์สด / สตรีมสดจาก ${game.name}!**\n📌 **${videoTitle}**\n${videoLink} @everyone`;
        } else {
            messageText = `🎬 **คลิปวิดีโออัปเดตใหม่ล่าสุดจาก ${game.name}**\n📌 **${videoTitle}**\n${videoLink} @everyone`;
        }

        await channel.send({ content: messageText });
        console.log(`[YouTubeNews] โพสต์ ${isLive ? 'ไลฟ์สด' : 'คลิป'} "${videoTitle}" สำเร็จ!`);

    } catch (error) {
        console.error(`[YouTubeNews Error] ${game.name}:`, error.message);
    }
}

// ฟังก์ชันสำหรับตรวจจับคำ/ลักษณะของ Live Stream
function checkIfLive(item) {
    const title = (item.title || '').toLowerCase();
    const link = (item.link || '').toLowerCase();
    const rawContent = JSON.stringify(item).toLowerCase();

    // เช็กว่ามีคำที่สื่อถึงการสตรีมสดในชื่อคลิปหรือลิงก์หรือไม่
    const liveKeywords = ['live', 'ถ่ายทอดสด', 'สตรีมสด', 'premiere', 'กำลังถ่ายทอดสด'];
    
    if (link.includes('/live/') || rawContent.includes('yt:servicetype') || rawContent.includes('livebroadcast')) {
        return true;
    }

    return liveKeywords.some(keyword => title.includes(keyword));
}
