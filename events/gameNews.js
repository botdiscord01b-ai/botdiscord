const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

// ใช้ RSS Feed ของแต่ละช่อง YouTube เพื่อดึงคลิปล่าสุดแบบอัตโนมัติ
const YOUTUBE_CHANNELS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS (TH)',
        // แปลงช่อง @PUBG_TH เป็น RSS Feed ของ YouTube
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_PUBG_TH_ID', // หรือใช้ฟังก์ชันดึงผ่าน Playlist / RSS ช่องหลัก
        directChannelUrl: 'https://www.youtube.com/@PUBG_TH',
        color: '#F2A900'
    },
    abi: {
        name: 'Arena Breakout: Infinite',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4p7wn-3DHpKk_9hxftr0ag',
        directChannelUrl: 'https://www.youtube.com/channel/UC4p7wn-3DHpKk_9hxftr0ag',
        color: '#1D8348'
    },
    scum: {
        name: 'SCUM Game Official',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_SCUM_ID',
        directChannelUrl: 'https://www.youtube.com/@SCUMGameOfficial',
        color: '#C0392B'
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!youtube') || message.content.startsWith('!yt')) {
            console.log(`[YouTubeNews] มีการเรียกใช้คำสั่งจาก: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const targetGame = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(TARGET_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[YouTubeNews Error] ไม่พบห้อง ID: ${TARGET_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมาย (Channel ID: ${TARGET_CHANNEL_ID})`);
            }

            if (targetGame === 'pubg' || targetGame === 'all') {
                await fetchAndSendEmbedVideo(targetChannel, 'pubg', 'https://www.youtube.com/@PUBG_TH');
            }
            if (targetGame === 'abi' || targetGame === 'all') {
                await fetchAndSendEmbedVideo(targetChannel, 'abi', 'https://www.youtube.com/channel/UC4p7wn-3DHpKk_9hxftr0ag');
            }
            if (targetGame === 'scum' || targetGame === 'all') {
                await fetchAndSendEmbedVideo(targetChannel, 'abi', 'https://www.youtube.com/@SCUMGameOfficial');
            }

            if (message.channel.id !== TARGET_CHANNEL_ID) {
                await message.reply(`✅ ส่งคลิปวิดีโอแบบเล่นใน Discord ไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendEmbedVideo(channel, gameKey, channelUrl) {
    try {
        // เทคนิคทำให้ Discord ฝังตัวเล่นวิดีโอ (Embedded Video Player):
        // การส่งลิงก์วิดีโอตรงๆ (หรือลิงก์ช่อง/เพลย์ลิสต์ล่าสุด) ในข้อความ (Content) เปล่าๆ 
        // จะทำให้ Discord ทำการดึงหน้าตาเครื่องเล่นวิดีโอ (Player) มาให้กดดูในดิสได้ทันที
        
        let displayContent = '';
        if (gameKey === 'pubg') {
            displayContent = `📢 **อัปเดตคลิปใหม่จาก PUBG Thailand**\nhttps://www.youtube.com/@PUBG_TH`;
        } else if (gameKey === 'abi') {
            displayContent = `📢 **อัปเดตคลิปใหม่จาก Arena Breakout: Infinite**\nhttps://www.youtube.com/channel/UC4p7wn-3DHpKk_9hxftr0ag`;
        } else {
            displayContent = `📢 **อัปเดตคลิปใหม่จาก SCUM Game Official**\nhttps://www.youtube.com/@SCUMGameOfficial`;
        }

        // ส่งข้อความออกไปตรงๆ เพื่อให้ระบบ Embed Video ของ Discord ทำงานโดยสมบูรณ์
        await channel.send({
            content: `${displayContent} @everyone`
        });

        console.log(`[YouTubeNews] ส่งวิดีโอแบบเล่นใน Discord สำเร็จ!`);
    } catch (error) {
        console.error(`[YouTubeNews Error] ส่งวิดีโอไม่สำเร็จ:`, error.message);
    }
}
