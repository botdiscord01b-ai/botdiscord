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
                await fetchAndSendSteamGame(targetChannel, 'new');
            }
            if (action === 'sale' || action === 'all') {
                await fetchAndSendSteamGame(targetChannel, 'sale');
            }

            if (message.channel.id !== STEAM_CHANNEL_ID) {
                await message.reply(`✅ ดึงข้อมูลเกมจริงจาก Steam ส่งไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendSteamGame(channel, type) {
    try {
        console.log(`[SteamNews] กำลังค้นหาข้อมูลเกม Steam (${type})...`);
        
        const searchUrl = type === 'sale' 
            ? 'https://store.steampowered.com/search/results/?query=&category1=998&specials=1&json=1&cc=TH'
            : 'https://store.steampowered.com/search/results/?query=&sort_by=Released_DESC&json=1&cc=TH';

        const response = await fetch(searchUrl);
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            throw new Error('ไม่พบข้อมูลเกมจาก Steam API');
        }

        // สุ่มหยิบเกมขึ้นมา 1 เกมจากผลการค้นหา
        const randomIndex = Math.floor(Math.random() * Math.min(data.items.length, 10));
        const selectedGame = data.items[randomIndex];
        
        const appId = selectedGame.id;
        const gameName = selectedGame.name || 'Unknown Game';
        const storeUrl = `https://store.steampowered.com/app/${appId}`;
        const headerImage = selectedGame.tiny_image || selectedGame.logo || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800';

        // ดึงรายละเอียดราคาเพิ่มเติมของ AppID นั้นๆ
        let priceText = 'ตรวจสอบราคาบนหน้าสโตร์';
        try {
            const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=TH&l=thai`);
            const detailData = await detailRes.json();

            if (detailData && detailData[appId] && detailData[appId].success) {
                const gameDetails = detailData[appId].data;
                if (gameDetails && gameDetails.price_overview) {
                    const priceOverview = gameDetails.price_overview;
                    const finalFormatted = priceOverview.final_formatted;
                    const initialFormatted = priceOverview.initial_formatted;
                    const discountPercent = priceOverview.discount_percent;

                    if (discountPercent > 0) {
                        priceText = `~~${initialFormatted}~~ **${finalFormatted}** (-${discountPercent}%)`;
                    } else {
                        priceText = `${finalFormatted}`;
                    }
                } else if (gameDetails && gameDetails.is_free) {
                    priceText = 'เล่นฟรี (Free to Play)';
                }
            }
        } catch (priceErr) {
            console.log(`[SteamNews Warning] ไม่สามารถดึงราคารายละเอียดได้ ใช้ค่าเริ่มต้นแทน:`, priceErr.message);
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
            .setDescription(`🏷️ **ราคา:** ${priceText}\n\n> *ข้อมูลอัปเดตสดตรงจาก Steam Store*`)
            .setImage(headerImage)
            .setTimestamp()
            .setFooter({ text: `Steam Live API • ID: ${idKey}` });

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
