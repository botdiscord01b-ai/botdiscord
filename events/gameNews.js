const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const STEAM_CHANNEL_ID = '1547172389647814717';

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!steam') || message.content.startsWith('!st')) {
            console.log(`[SteamNews] เริ่มกระบวนการดึงข้อมูล Steam โดย: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const action = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(STEAM_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[SteamNews Error] ไม่พบห้องเป้าหมาย ID: ${STEAM_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมายสำหรับ Steam (Channel ID: ${STEAM_CHANNEL_ID})`);
            }

            if (action === 'new' || action === 'all') {
                await fetchAndSendSteamNews(targetChannel, 'new');
            }
            if (action === 'sale' || action === 'all') {
                await fetchAndSendSteamNews(targetChannel, 'sale');
            }

            if (message.channel.id !== STEAM_CHANNEL_ID) {
                await message.reply(`✅ ดึงข้อมูลเกม Steam ส่งไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendSteamNews(channel, type) {
    try {
        console.log(`[SteamNews] กำลังเชื่อมต่อข้อมูลประเภท: ${type}...`);
        
        // ใช้ SteamSpy API เพื่อดึงเกมยอดฮิตหรือเกมลดราคายอดนิยม
        const apiUrl = type === 'sale'
            ? 'https://steamspy.com/api.php?request=tag&tag=Indie' 
            : 'https://steamspy.com/api.php?request=top100in2weeks';

        const response = await fetch(apiUrl);
        const data = await response.json();

        const appIds = Object.keys(data);
        if (!appIds || appIds.length === 0) {
            throw new Error('ไม่สามารถดึงรายชื่อเกมจาก API ได้');
        }

        // สุ่มเลือก AppID มา 1 เกม
        const randomAppId = appIds[Math.floor(Math.random() * appIds.length)];
        const gameInfo = data[randomAppId];
        
        const gameName = gameInfo.name || 'Unknown Game';
        const storeUrl = `https://store.steampowered.com/app/${randomAppId}`;
        const headerImage = `https://cdn.akamai.steamstatic.com/steam/apps/${randomAppId}/header.jpg`;

        // ดึงราคาจริงจาก Steam App Details API
        let priceText = 'ตรวจสอบราคาบน Steam Store';
        try {
            const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${randomAppId}&cc=TH&l=thai`);
            const detailData = await detailRes.json();

            if (detailData && detailData[randomAppId] && detailData[randomAppId].success) {
                const details = detailData[randomAppId].data;
                if (details.price_overview) {
                    const p = details.price_overview;
                    if (p.discount_percent > 0) {
                        priceText = `~~${p.initial_formatted}~~ **${p.final_formatted}** (-${p.discount_percent}%)`;
                    } else {
                        priceText = `${p.final_formatted}`;
                    }
                } else if (details.is_free) {
                    priceText = 'เล่นฟรี (Free to Play)';
                }
            }
        } catch (err) {
            console.log(`[SteamNews Info] ข้ามการดึงราคา ใช้ค่าสำรองแทน`);
        }

        const idKey = `steam_${type}_${randomAppId}`;

        // ระบบเช็กและลบข้อความซ้ำอัตโนมัติ
        const messages = await channel.messages.fetch({ limit: 50 });
        const duplicateMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes(idKey)
        );

        if (duplicateMessages.size > 0) {
            console.log(`[SteamNews] ลบโพสต์เกมซ้ำของ ${gameName}...`);
            for (const [msgId, oldMsg] of duplicateMessages) {
                await oldMsg.delete().catch(() => {});
            }
        }

        const embed = new EmbedBuilder()
            .setColor(type === 'new' ? '#1b2838' : '#66c0f4')
            .setAuthor({ 
                name: type === 'new' ? `🔥 STEAM NEW RELEASE | เกมมาใหม่` : `💰 STEAM SPECIAL SALE | เกมลดราคาพิเศษ`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/220/220229.png' 
            })
            .setTitle(`📌 ${gameName}`)
            .setDescription(`🏷️ **ราคา/สถานะ:** ${priceText}\n\n> *ข้อมูลอัปเดตสดจาก Steam Store*`)
            .setImage(headerImage)
            .setTimestamp()
            .setFooter({ text: `Steam Spy & API • ID: ${idKey}` });

        const button = new ButtonBuilder()
            .setLabel('🛒 ดูรายละเอียดและกดซื้อบน Steam')
            .setStyle(ButtonStyle.Link)
            .setUrl(storeUrl); // ใช้คำสั่งพิมพ์เล็กถูกต้องตามมาตรฐาน

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({
            content: `||${idKey}||`,
            embeds: [embed],
            components: [row]
        });

        console.log(`[SteamNews] โพสต์เกม ${gameName} สำเร็จเรียบร้อย!`);
    } catch (error) {
        console.error(`[SteamNews Error] เกิดข้อผิดพลาด:`, error.message);
    }
}
