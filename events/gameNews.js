const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Parser = require('rss-parser');

const parser = new Parser();
const TARGET_CHANNEL_ID = '1546974845244416070';

const GAME_CONFIGS = {
    pubg: {
        name: 'PUBG: BATTLEGROUNDS',
        feedUrl: 'https://pubg.com/en/rss/news',
        color: '#F2A900'
    },
    abi: {
        name: 'Arena Breakout: Infinite',
        feedUrl: 'https://arenabreakoutinfinite.com/news/rss',
        color: '#1D8348'
    },
    scum: {
        name: 'SCUM',
        feedUrl: 'https://scumgame.com/news/rss',
        color: '#C0392B'
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!news')) {
            console.log(`[GameNews] มีการเรียกใช้คำสั่ง !news จาก: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const targetGame = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(TARGET_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[GameNews Error] ไม่พบห้อง ID: ${TARGET_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมาย (Channel ID: ${TARGET_CHANNEL_ID})`);
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
                await message.reply(`✅ ดึงเนื้อหาข่าวสารล่าสุดพร้อมข้อความประกาศส่งตรงไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendLatestNews(channel, game) {
    try {
        console.log(`[GameNews] กำลังดึงเนื้อหาข่าวของเกม ${game.name}...`);
        const feed = await parser.parseURL(game.feedUrl);
        const latestItem = feed.items && feed.items.length > 0 ? feed.items[0] : null;

        if (!latestItem) {
            throw new Error('ไม่พบข้อมูลใน RSS Feed');
        }

        const newsTitle = latestItem.title || 'ประกาศอัปเดตล่าสุด';
        const newsLink = latestItem.link || game.feedUrl;
        const newsDate = latestItem.pubDate ? new Date(latestItem.pubDate).toLocaleString('th-TH') : 'ล่าสุดวันนี้';
        
        // ดึงเนื้อหาข้อความ (Description หรือ Content) จาก RSS มาทำความสะอาด (ตัด HTML Tags เบื้องต้นออกเพื่อให้แสดงผลใน Discord สวยๆ)
        let rawContent = latestItem.contentSnippet || latestItem.content || latestItem.summary || 'คลิกดูรายละเอียดเนื้อหาฉบับเต็มได้จากลิงก์ด้านล่าง';
        
        // ตัดข้อความให้สั้นกระชับไม่เกิน 300 ตัวอักษร เพื่อไม่ให้ Embed ยาวเกินไป
        if (rawContent.length > 300) {
            rawContent = rawContent.substring(0, 300) + '...';
        }

        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setAuthor({ 
                name: `🎮 GAME NEWS TRACKER | อัปเดตเนื้อหาล่าสุด`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/3334/3334886.png' 
            })
            .setTitle(`📌 [${game.name}] ${newsTitle}`)
            .setURL(newsLink)
            .setDescription(`> ${rawContent}`) // แสดงเนื้อหาโพสต์จริงๆ ตรงนี้
            .addFields(
                { 
                    name: '📅 วันที่เผยแพร่', 
                    value: `\`\`\`fix\n${newsDate}\n\`\`\``, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `ระบบดึงข้อความอัตโนมัติ • ${game.name}`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' 
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🌐 อ่านเนื้อหาฉบับเต็ม')
                    .setStyle(ButtonStyle.Link)
                    .setUrl(newsLink)
            );

        await channel.send({ 
            content: `📢 **ประกาศอัปเดตใหม่!** สำหรับเกม **${game.name}** @everyone`,
            embeds: [embed], 
            components: [row] 
        });
        console.log(`[GameNews] โพสต์เนื้อหาของเกม ${game.name} สำเร็จ!`);
    } catch (error) {
        console.error(`[GameNews Error] ดึงข้อมูลของ ${game.name} ไม่สำเร็จ:`, error.message);
        
        // กรณีดึง RSS ไม่สำเร็จ ส่งการ์ดสำรองพร้อมลิงก์ตรง
        const embed = new EmbedBuilder()
            .setColor(game.color)
            .setTitle(`📌 [${game.name}] อัปเดตล่าสุด`)
            .setDescription(`ไม่สามารถดึงข้อความตัวอย่างอัตโนมัติได้ในขณะนี้ สามารถติดตามรายละเอียดแพตช์ล่าสุดได้ที่เว็บไซต์ทางการ`)
            .addFields({ name: '🔗 ลิงก์ทางการ', value: `[คลิกเพื่อดูรายละเอียด](${game.feedUrl})` })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }
}
