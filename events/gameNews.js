const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

const GAME_CONFIGS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS',
        feedUrl: 'https://pubg.com/en/rss/news',
        color: '#F2A900',
        thumbnail: 'https://cdn.icon-icons.com/icons2/2699/PNG/512/pubg_logo_icon_168538.png'
    },
    abi: {
        name: 'Arena Breakout: Infinite',
        feedUrl: 'https://arenabreakoutinfinite.com/news/rss',
        color: '#1D8348',
        thumbnail: 'https://images.seeklogo.com/logo-png/52/1/arena-breakout-infinite-logo-png_svg_logo-png_csharp.png'
    },
    scum: {
        name: 'SCUM',
        feedUrl: 'https://scumgame.com/news/rss',
        color: '#C0392B',
        thumbnail: 'https://cdn.icon-icons.com/icons2/3913/PNG/512/scum_logo_icon_248550.png'
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!news')) {
            const args = message.content.split(' ');
            const targetGame = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(TARGET_CHANNEL_ID);
            
            if (!targetChannel) {
                return message.reply('❌ ไม่พบห้องที่กำหนด (Channel ID ไม่ถูกต้อง หรือบอทมองไม่เห็นห้องนี้)');
            }

            if (targetGame === 'pubg' || targetGame === 'all') {
                await fetchAndSendLatestNews(targetChannel, GAME_CONFIGS.pubg);
            }
            if (targetGame === 'abi' || targetGame === 'all') {
                await fetchAndSendLatestNews(targetChannel, GAME_CONFIGS.abi);
            }
            if (targetGame === 'scum' || targetGame === 'all') {
                await fetchAndSendLatestNews(targetChannel, GAME_CONFIGS.scum);
            }

            if (message.channel.id !== TARGET_CHANNEL_ID) {
                await message.reply(`✅ ดึงข้อมูลข่าวสารล่าสุด (เฉพาะตัวล่าสุดอันเดียว) ส่งตรงไปยังห้องเป้าหมายเรียบร้อยแล้วครับ!`);
            }
        }
    }
};

async function fetchAndSendLatestNews(channel, game) {
    try {
        // ดึงข้อมูล RSS และเลือกเอาเฉพาะรายการแรก (item ที่สดและใหม่ที่สุด) เท่านั้น
        const feed = await parser.parseURL(game.feedUrl);
        const latestItem = feed.items && feed.items.length > 0 ? feed.items[0] : null;

        const newsTitle = latestItem ? latestItem.title : `อัปเดตล่าสุดประจำวันที่สดใหม่ที่สุด`;
        const newsLink = latestItem ? latestItem.link : game.feedUrl;
        const newsDate = latestItem && latestItem.pubDate ? new Date(latestItem.pubDate).toLocaleString('th-TH') : 'ล่าสุดวันนี้';

        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setAuthor({ 
                name: `🎮 GAME NEWS TRACKER | ข่าวสารใหม่ล่าสุด`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/3334/3334886.png' 
            })
            .setTitle(`📌 [${game.name}] ${newsTitle}`)
            .setURL(newsLink)
            .setDescription(`> *อัปเดตล่าสุดส่งตรงจากทีมพัฒนา ไม่รวมข่าวเก่า*`)
            .addFields(
                { 
                    name: '📅 วันที่เผยแพร่', 
                    value: `\`\`\`fix\n${newsDate}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: '🔗 **ลิงก์อ่านเนื้อหาฉบับเต็ม**', 
                    value: `• [คลิกที่นี่เพื่อดูรายละเอียดแพตช์ล่าสุด](${newsLink})`, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `ระบบดึงข้อมูลอัตโนมัติ • ${game.name}`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' 
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🌐 อ่านข่าวล่าสุดนี้')
                    .setStyle(ButtonStyle.Link)
                    .setUrl(newsLink)
            );

        await channel.send({ 
            content: `📢 **อัปเดตใหม่ล่าสุดมาแล้ว!**สำหรับเกม **${game.name}** @everyone`,
            embeds: [embed], 
            components: [row] 
        });
    } catch (error) {
        console.error(`Error fetching latest RSS for ${game.name}:`, error);
        // กรณีดึง RSS ภายนอกไม่ได้ชั่วคราว จะทำการ Fallback โชว์การ์ดอัปเดตล่าสุดเดี่ยวๆ โดยไม่รวมของเก่า
        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setTitle(`📌 [${game.name}] อัปเดตล่าสุดประจำรอบนี้`)
            .setDescription(`ติดตามข้อมูลข่าวสารแพตช์ล่าสุดได้ที่เว็บไซต์ทางการ`)
            .addFields({ name: '🔗 ลิงก์ทางการ', value: `[คลิกเพื่อดูรายละเอียด](${game.feedUrl})` })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }
}
