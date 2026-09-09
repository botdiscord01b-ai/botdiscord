const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const STEAM_CHANNEL_ID = '1547172389647814717';

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!steam') || message.content.startsWith('!st')) {
            console.log(`[SteamNews] กำลังดึงข้อมูลจริงจาก Steam API โดย: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const action = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(STEAM_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[SteamNews Error] ไม่พบห้องเป้าหมาย ID: ${STEAM_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมายสำหรับ Steam (Channel ID: ${STEAM_CHANNEL_ID})`);
            }

            if (action === 'new' || action === 'all') {
                await fetchAndSendRealSteamGames(targetChannel, 'new');
            }
            if (action === 'sale' || action === 'all') {
                await fetchAndSendRealSteamGames(targetChannel, 'sale');
            }

            if (message.channel.id !== STEAM_CHANNEL_ID) {
                await message.reply(`✅ ดึงข้อมูลเกมจริงจาก Steam ส่งไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendRealSteamGames(channel, type) {
    try {
        console.log(`[SteamNews] กำลังเชื่อมต่อดึงข้อมูล Steam (${type})...`);
        
        const response = await fetch('https://store.steampowered.com/api/featured?l=thai');
        const data = await response.json();

        let gameList = [];
        if (type === 'sale') {
            gameList = data.specials?.items || [];
        } else {
            gameList = data.coming_soon?.items || data.recommendations?.items || [];
        }

        if (!gameList || gameList.length === 0) {
            throw new Error('ไม่พบข้อมูลเกมจาก Steam API');
        }

        const game = gameList[0];
        const gameName = game.name || 'Unknown Game';
        const appId = game.id;
        const headerImage = game.header_image || game.large_capsule_image;
        const storeUrl = `https://store.steampowered.com/app/${appId}`;
        
        let priceText = 'เปิดให้เล่นแล้ว';
        if (game.discounted) {
            const originalPrice = (game.original_price / 100).toLocaleString();
            const finalPrice = (game.final_price / 100).toLocaleString();
            priceText = `~~฿${originalPrice}~~ **฿${finalPrice}** (-${game.discount_percent}%)`;
        } else if (game.final_price) {
            const price = (game.final_price / 100).toLocaleString();
            priceText = `฿${price}`;
        }

        const idKey = `steam_${type}_${appId}`;

        // ระบบตรวจสอบและลบโพสต์เกมเดิมที่ซ้ำอัตโนมัติ
        const messages = await channel.messages.fetch({ limit: 50 });
        const duplicateMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes(idKey)
        );

        if (duplicateMessages.size > 0) {
            console.log(`[SteamNews] พบโพสต์เกมซ้ำ (${gameName}) กำลังทำความสะอาด...`);
            for (const [msgId, oldMsg] of duplicateMessages) {
                await oldMsg.delete().catch(err => console.log('ไม่สามารถลบข้อความเก่าได้:', err.message));
            }
        }

        const embed = new EmbedBuilder()
            .setColor(type === 'new' ? '#1b2838' : '#66c0f4')
            .setAuthor({ 
                name: type === 'new' ? `🔥 STEAM NEW RELEASE | เกมมาใหม่` : `💰 STEAM SPECIAL SALE | เกมลดราคาพิเศษ`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/220/220229.png' 
            })
            .setTitle(`📌 ${gameName}`)
            .setDescription(`🏷️ **ราคา / สถานะ:** ${priceText}\n\n> *ข้อมูลอัปเดตสดตรงจาก Steam Store*`)
            .setImage(headerImage)
            .setTimestamp()
            .setFooter({ text: `Steam Live API • ID: ${idKey}` });

        // แก้ไขเป็น .setUrl() ตัวแอลพิมพ์เล็ก
        const button = new ButtonBuilder()
            .setLabel('🛒 ดูรายละเอียดและกดซื้อบน Steam')
            .setStyle(ButtonStyle.Link)
            .setUrl(storeUrl);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({
            content: `||${idKey}||`,
            embeds: [embed],
            components: [row]
        });

        console.log(`[SteamNews] โพสต์เกม ${gameName} สำเร็จ!`);
    } catch (error) {
        console.error(`[SteamNews Error] ดึงข้อมูล Steam จริงไม่สำเร็จ:`, error.message);
    }
}
