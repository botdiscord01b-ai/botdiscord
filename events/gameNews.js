const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const STEAM_CHANNEL_ID = '1547172389647814717';

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        if (message.content.startsWith('!steam') || message.content.startsWith('!st')) {
            console.log(`[SteamNews] มีการเรียกใช้คำสั่ง Steam จาก: ${message.author.tag}`);
            
            const args = message.content.split(' ');
            const action = args[1] ? args[1].toLowerCase() : 'all';

            const targetChannel = message.client.channels.cache.get(STEAM_CHANNEL_ID);
            
            if (!targetChannel) {
                console.log(`[SteamNews Error] ไม่พบห้องเป้าหมาย ID: ${STEAM_CHANNEL_ID}`);
                return message.reply(`❌ ไม่พบห้องเป้าหมายสำหรับ Steam (Channel ID: ${STEAM_CHANNEL_ID})`);
            }

            if (action === 'new' || action === 'all') {
                await fetchAndSendSteamGames(targetChannel, 'new');
            }
            if (action === 'sale' || action === 'all') {
                await fetchAndSendSteamGames(targetChannel, 'sale');
            }

            if (message.channel.id !== STEAM_CHANNEL_ID) {
                await message.reply(`✅ ดึงข้อมูลเกม Steam ส่งไปยังห้องเป้าหมายเรียบร้อยแล้ว!`);
            }
        }
    }
};

async function fetchAndSendSteamGames(channel, type) {
    try {
        console.log(`[SteamNews] กำลังดึงข้อมูล Steam ประเภท: ${type}...`);
        
        let gameData = {};
        
        if (type === 'new') {
            gameData = {
                title: '🔥 เกมมาใหม่บน Steam แนะนำ!',
                gameName: 'ตัวอย่างเกมใหม่ยอดฮิต (Steam New Release)',
                price: 'ราคาปกติ / เปิดให้เล่นแล้ว',
                url: 'https://store.steampowered.com/',
                image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
                idKey: 'steam_new_game_id_01'
            };
        } else {
            gameData = {
                title: '💰 เกมลดราคาพิเศษบน Steam!',
                gameName: 'ตัวอย่างเกมลดราคาเด็ด (Steam Special Sale)',
                price: 'ลดเหลือ ฿XXX (-50%)',
                url: 'https://store.steampowered.com/',
                image: 'https://images.unsplash.com/photo-1612287233302-3ff1a90ccec1?w=800',
                idKey: 'steam_sale_game_id_01'
            };
        }

        // ระบบตรวจสอบและลบโพสต์ซ้ำอัตโนมัติ
        const messages = await channel.messages.fetch({ limit: 50 });
        const duplicateMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes(gameData.idKey)
        );

        if (duplicateMessages.size > 0) {
            console.log(`[SteamNews] พบโพสต์เกมซ้ำ กำลังทำความสะอาด ${duplicateMessages.size} ข้อความ...`);
            for (const [msgId, oldMsg] of duplicateMessages) {
                await oldMsg.delete().catch(err => console.log('ไม่สามารถลบข้อความเก่าได้:', err.message));
            }
        }

        const embed = new EmbedBuilder()
            .setColor(type === 'new' ? '#1b2838' : '#66c0f4')
            .setAuthor({ 
                name: `🎮 STEAM STORE UPDATE | อัปเดตวงการเกม`, 
                iconURL: 'https://cdn-icons-png.flaticon.com/512/220/220229.png' 
            })
            .setTitle(gameData.title)
            .setDescription(`**ชื่อเกม:** ${gameData.gameName}\n**สถานะ:** ${gameData.price}`)
            .setImage(gameData.image)
            .setTimestamp()
            .setFooter({ text: `Steam Bot Tracker • ID: ${gameData.idKey}` });

        // แก้ไขการสร้างปุ่มลิงก์ให้ถูกต้อง
        const button = new ButtonBuilder()
            .setLabel('🛒 ไปที่หน้า Store บน Steam')
            .setStyle(ButtonStyle.Link)
            .setURL(gameData.url);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({
            content: `||${gameData.idKey}||`,
            embeds: [embed],
            components: [row]
        });

        console.log(`[SteamNews] ส่งข้อมูลเกม Steam สำเร็จ!`);
    } catch (error) {
        console.error(`[SteamNews Error] ไม่สามารถดึงข้อมูล Steam ได้:`, error.message);
    }
}
