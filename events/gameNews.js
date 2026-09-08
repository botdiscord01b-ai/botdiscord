const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

// ใช้ลิงก์ RSS Feed ตรงของแต่ละช่อง YouTube ที่คุณให้มา
const YOUTUBE_FEEDS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS (TH)',
        // แปลงจากลิงก์ @PUBG_TH เป็น RSS Feed ของ YouTube
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?user=PUBG_TH' 
    },
    abi: {
        name: 'Arena Breakout: Infinite',
        // แปลงจากลิงก์ channel/UC4p7wn-3DHpKk_9hxftr0ag เป็น RSS Feed
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4p7wn-3DHpKk_9hxftr0ag'
    },
    scum: {
        name: 'SCUM Game Official',
        // แปลงจากลิงก์ @SCUMGameOfficial เป็น RSS Feed (หรือค้นหา Channel ID ของ SCUM)
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?user=SCUMGameOfficial'
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!youtube') || message.content.startsWith('!yt')) {
            console.log(`[YouTubeNews] กำลังดึงคลิปล่าสุดจาก RSS... โดย: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const targetGame = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(TARGET_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[YouTubeNews Error] ไม่พบห้อง ID: ${TARGET_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมาย (Channel ID: ${TARGET_CHANNEL_ID})`);
            }

            if (targetGame === 'pubg' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_FEEDS.pubg);
            }
            if (targetGame === 'abi' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_FEEDS.abi);
            }
            if (targetGame === 'scum' || targetGame === 'all') {
                await fetchAndSendLatestVideo(targetChannel, YOUTUBE_FEEDS.scum);
            }

            if (message.channel.id !== TARGET_CHANNEL_ID) {
                await message.reply(`✅ ดึงและส่งคลิปล่าสุดจาก YouTube ไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendLatestVideo(channel, game) {
    try {
        console.log(`[YouTubeNews] กำลังดึงฟีดของ ${game.name}...`);
        const feed = await parser.parseURL(game.feedUrl);
        
        if (!feed.items || feed.items.length === 0) {
            throw new Error('ไม่พบวิดีโอในฟีด');
        }

        // ดึงวิดีโอล่าสุดอันแรก (ตัวใหม่ล่าสุด)
        const latestVideo = feed.items[0];
        const videoTitle = latestVideo.title;
        const videoLink = latestVideo.link;

        // ส่งลิงก์วิดีโอล่าสุดตรงๆ เพื่อให้ Discord ทำการ Embed ตัวเล่นวิดีโอขึ้นมาให้กดดูได้ทันที
        await channel.send({
            content: `🎬 **คลิปใหม่ล่าสุดจาก ${game.name}**\n📌 **${videoTitle}**\n${videoLink} @everyone`
        });

        console.log(`[YouTubeNews] ส่งคลิป ${videoTitle} สำเร็จ!`);
    } catch (error) {
        console.error(`[YouTubeNews Error] ดึงคลิปของ ${game.name} ไม่สำเร็จ:`, error.message);
        
        // กรณีดึง RSS ของช่องนั้นตรงๆ ไม่ผ่าน (เช่น YouTube เปลี่ยนโครงสร้างฟีด user) ให้ส่งลิงก์หน้าหลักสำรองแทน
        let backupLink = 'https://www.youtube.com';
        if (game.name.includes('PUBG')) backupLink = 'https://www.youtube.com/@PUBG_TH';
        if (game.name.includes('Arena')) backupLink = 'https://www.youtube.com/channel/UC4p7wn-3DHpKk_9hxftr0ag';
        if (game.name.includes('SCUM')) backupLink = 'https://www.youtube.com/@SCUMGameOfficial';

        await channel.send({
            content: `📢 **อัปเดตจากช่อง ${game.name}**\n${backupLink} @everyone`
        });
    }
}
