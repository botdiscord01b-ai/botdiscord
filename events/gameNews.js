const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

// ใช้ RSS Feed ของช่อง YouTube ทางการแต่ละเกม เพื่อดึงคลิปล่าสุดแบบแม่นยำ
const YOUTUBE_CHANNELS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS (YouTube)',
        // YouTube Channel RSS Feed ของ PUBG (Channel ID: UCtTz94E_r6-Nq08U1t7p15g หรือใช้ Playlist/Search ทางการ)
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC5_7w_vO92-lS38PqQ8d3Xw', 
        color: '#F2A900'
    },
    abi: {
        name: 'Arena Breakout: Infinite (YouTube)',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCi9-47r1x_W8c-Kx5tN8VlQ',
        color: '#1D8348'
    },
    scum: {
        name: 'SCUM Game (YouTube)',
        feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCuS7h1n0YQ_K6j7z8K3Q8bA',
        color: '#C0392B'
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // คำสั่งเรียก: !youtube หรือ !yt ตามด้วยชื่อเกม หรือ all
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
                await fetchAndSendYouTubeVideo(targetChannel, YOUTUBE_CHANNELS.pubg);
            }
            if (targetGame === 'abi' || targetGame === 'all') {
                await fetchAndSendYouTubeVideo(targetChannel, YOUTUBE_CHANNELS.abi);
            }
            if (targetGame === 'scum' || targetGame === 'all') {
                await fetchAndSendYouTubeVideo(targetChannel, YOUTUBE_CHANNELS.scum);
            }

            if (message.channel.id !== TARGET_CHANNEL_ID) {
                await message.reply(`✅ ดึงคลิปวิดีโออัปเดตล่าสุดจาก YouTube ส่งตรงไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendYouTubeVideo(channel, game) {
    try {
        console.log(`[YouTubeNews] กำลังดึงวิดีโอล่าสุดของ ${game.name}...`);
        const feed = await parser.parseURL(game.feedUrl);
        const latestVideo = feed.items && feed.items.length > 0 ? feed.items[0] : null;

        if (!latestVideo) {
            throw new Error('ไม่พบวิดีโอใน RSS Feed ของ YouTube');
        }

        const videoTitle = latestVideo.title || 'วิดีโออัปเดตล่าสุด';
        const videoLink = latestVideo.link || 'https://www.youtube.com';
        const videoDate = latestVideo.pubDate ? new Date(latestVideo.pubDate).toLocaleString('th-TH') : 'ล่าสุดวันนี้';
        
        // ดึง Video ID เพื่อเอามาทำภาพ Thumbnail อัตโนมัติจาก YouTube
        const videoIdMatch = videoLink.match(/(?:v=|\/v\/|embed\/|youtu\.be\/)([^&?/\s]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';

        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setAuthor({ 
                name: `🎬 YOUTUBE OFFICIAL UPDATE | คลิปใหม่ล่าสุด`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' 
            })
            .setTitle(`📌 [${game.name}] ${videoTitle}`)
            .setURL(videoLink)
            .setDescription(`> *คลิปวิดีโออัปเดตอย่างเป็นทางการส่งตรงจากช่อง YouTube หลัก ไม่พลาดทุกข่าวสารสำคัญ*`)
            .addFields(
                { 
                    name: '📅 วันที่ปล่อยคลิป', 
                    value: `\`\`\`fix\n${videoDate}\n\`\`\``, 
                    inline: false 
                }
            )
            .setImage(thumbnailUrl) // แสดงรูปพรีวิวคลิป YouTube อัตโนมัติใน Embed
            .setTimestamp()
            .setFooter({ 
                text: `YouTube Bot Tracker • ${game.name}`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' 
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('▶️ รับชมคลิปเต็มบน YouTube')
                    .setStyle(ButtonStyle.Link)
                    .setUrl(videoLink)
            );

        await channel.send({ 
            content: `🎥 **มีคลิปวิดีโออัปเดตใหม่ปล่อยออกมาแล้ว!** สำหรับเกม **${game.name}** @everyone`,
            embeds: [embed], 
            components: [row] 
        });
        console.log(`[YouTubeNews] ส่งคลิปของ ${game.name} สำเร็จ!`);
    } catch (error) {
        console.error(`[YouTubeNews Error] ดึงคลิปของ ${game.name} ไม่สำเร็จ:`, error.message);
        
        // กรณีดึง RSS YouTube ขัดข้อง ให้ส่งการ์ดสำรองพร้อมลิงก์หน้าช่องหลัก
        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setTitle(`📌 [${game.name}] ช่อง YouTube ทางการ`)
            .setDescription(`สามารถติดตามรับชมคลิปวิดีโออัปเดตและเทรลเลอร์ใหม่ล่าสุดได้ที่ช่อง YouTube หลักของเกม`)
            .addFields({ name: '🔗 ลิงก์ช่อง YouTube', value: `[คลิกเพื่อไปที่ช่อง](${game.feedUrl.replace('/feeds/videos.xml?channel_id=', '/channel/')})` })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }
}
