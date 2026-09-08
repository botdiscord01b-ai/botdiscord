const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

// รวมช่อง YouTube ทางการครบทั้ง 4 เกม พร้อม Channel ID ที่ถูกต้อง
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
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!youtube') || message.content.startsWith('!yt')) {
            console.log(`[YouTubeNews] กำลังดึงคลิปล่าสุดจากช่อง YouTube... โดย: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const targetGame = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(TARGET_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[YouTubeNews Error] ไม่พบห้อง ID: ${TARGET_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมาย (Channel ID: ${TARGET_CHANNEL_ID})`);
            }

            if (targetGame === 'pubg' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.pubg);
            }
            if (targetGame === 'abi' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.abi);
            }
            if (targetGame === 'scum' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.scum);
            }
            if (targetGame === 'valorant' || targetGame === 'val' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_CHANNELS.valorant);
            }

            if (message.channel.id !== TARGET_CHANNEL_ID) {
                await message.reply(`✅ ดึงคลิปล่าสุดและทำความสะอาดโพสต์ซ้ำเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendLatestVideo(channel, game) {
    try {
        console.log(`[YouTubeNews] กำลังดึงข้อมูลของ ${game.name}...`);
        const feed = await parser.parseURL(game.feedUrl);
        
        if (!feed.items || feed.items.length === 0) {
            throw new Error('ไม่พบวิดีโอในฟีด');
        }

        // ดึงเฉพาะคลิปล่าสุดอันแรก (ตัวใหม่ล่าสุดจริง ๆ)
        const latestVideo = feed.items[0];
        const videoTitle = latestVideo.title;
        const videoLink = latestVideo.link;

        // ดึง Video ID ออกมาเพื่อใช้ตรวจจับข้อความซ้ำได้อย่างแม่นยำ
        const videoIdMatch = videoLink.match(/(?:v=|\/v\/|embed\/|youtu\.be\/)([^&?/\s]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : videoLink;

        // ดึงข้อความล่าสุดในห้องเป้าหมายมาตรวจสอบ (ดึงมา 50 ข้อความล่าสุด)
        const messages = await channel.messages.fetch({ limit: 50 });
        
        // ค้นหาข้อความเดิมที่บอทเคยส่งและมีลิงก์หรือ Video ID เดียวกัน
        const duplicateMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes(videoId)
        );

        // ถ้าพบข้อความซ้ำ ให้ทำการลบออกอัตโนมัติ
        if (duplicateMessages.size > 0) {
            console.log(`[YouTubeNews] พบโพสต์ซ้ำของ ${game.name} จำนวน ${duplicateMessages.size} ข้อความ กำลังลบ...`);
            for (const [msgId, oldMsg] of duplicateMessages) {
                await oldMsg.delete().catch(err => console.log('ไม่สามารถลบข้อความเก่าได้:', err.message));
            }
        }

        // ส่งคลิปล่าสุดตัวใหม่เข้าไปในห้อง
        await channel.send({
            content: `🎬 **คลิปวิดีโออัปเดตใหม่ล่าสุดจาก ${game.name}**\n📌 **${videoTitle}**\n${videoLink} @everyone`
        });

        console.log(`[YouTubeNews] ส่งคลิป ${videoTitle} สำเร็จ!`);
    } catch (error) {
        console.error(`[YouTubeNews Error] ดึงคลิปของ ${game.name} ไม่สำเร็จ:`, error.message);
        
        // กรณีดึง RSS ขัดข้อง ให้ส่งลิงก์หน้าช่องหลักสำรอง
        await channel.send({
            content: `📢 **อัปเดตล่าสุดจากช่อง ${game.name}**\n${game.fallbackLink} @everyone`
        });
    }
}
