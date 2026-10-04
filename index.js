const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');
// ... โค้ดเชื่อมต่อ MongoDB หรือส่วนอื่นๆ ของคุณ ...

const STEAM_CHANNEL_ID = '1554496562128883742';
const notifiedGames = new Set();
const MAX_STORED_GAMES = 500;
let isFirstRun = true;

async function fetchSteamTrending() {
    try {
        const response = await fetch('https://store.steampowered.com/api/featuredcategories?cc=th&l=thai');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.new_releases?.items || [];
    } catch (error) {
        console.error('❌ [Steam API Error]:', error.message);
        return [];
    }
}

async function checkAndAnnounceSteamGames(client) {
    try {
        const channel = await client.channels.fetch(STEAM_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const games = await fetchSteamTrending();
        if (!games.length) return;

        if (isFirstRun) {
            for (const game of games) {
                notifiedGames.add(game.id);
            }
            isFirstRun = false;
            console.log(`✅ [Steam Tracker] โหลดรายการเกมเริ่มต้นเรียบร้อยแล้ว (${notifiedGames.size} รายการ)`);
            return;
        }

        let sendCount = 0;
        const MAX_SEND_PER_CHECK = 3;

        for (const game of games) {
            if (notifiedGames.has(game.id)) continue;

            notifiedGames.add(game.id);
            if (notifiedGames.size > MAX_STORED_GAMES) {
                const firstItem = notifiedGames.values().next().value;
                notifiedGames.delete(firstItem);
            }
            
            sendCount++;

            let priceText = '🆓 เล่นฟรี / ยังไม่ระบุ';
            let discountBadge = '';

            if (game.final_price !== undefined) {
                if (game.final_price === 0) {
                    priceText = '🆓 **เล่นฟรี (Free to Play)**';
                } else {
                    const originalPrice = game.original_price ? (game.original_price / 100).toLocaleString('th-TH') : null;
                    const finalPrice = (game.final_price / 100).toLocaleString('th-TH');

                    if (game.discount_percent > 0) {
                        priceText = `~~${originalPrice} บาท~~ ➔ **${finalPrice} บาท**`;
                        discountBadge = ` 🔥 **ลดราคา -${game.discount_percent}%**`;
                    } else {
                        priceText = `💵 **${finalPrice} บาท**`;
                    }
                }
            }

            const steamStoreUrl = `https://store.steampowered.com/app/${game.id}`;
            const headerImageUrl = game.large_capsule_image || game.header_image;

            const embed = new EmbedBuilder()
                .setColor(0x1b2838)
                .setAuthor({
                    name: 'STEAM STORE • NEW & TRENDING',
                    iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/768px-Steam_icon_logo.svg.png'
                })
                .setTitle(`🎮 ${game.name}`)
                .setURL(steamStoreUrl)
                .setDescription(`✨ **มีเกมมาใหม่กำลังฮิตติดชาร์ตบน Steam!**${discountBadge}`)
                .addFields(
                    { name: '💰 ราคาปัจจุบัน', value: priceText, inline: true },
                    { name: '🌟 แพลตฟอร์ม', value: '💻 PC (Steam)', inline: true }
                )
                .setImage(headerImageUrl)
                .setTimestamp()
                .setFooter({ text: 'Steam Live Tracker • MasaruBot', iconURL: client.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('เปิดดูหน้าสโตร์ Steam')
                    .setStyle(ButtonStyle.Link)
                    .setURL(steamStoreUrl)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setLabel('ค้นหารีวิวบน YouTube')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(game.name + ' review')}`)
                    .setEmoji('🔍')
            );

            await channel.send({ embeds: [embed], components: [row] });
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (sendCount >= MAX_SEND_PER_CHECK) break;
        }
    } catch (error) {
        console.error('❌ [Steam Module Error]:', error);
    }
}

// ================= Event หลักของบอท (รวมทุกอย่างไว้ที่นี่) =================
client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    console.log('🎮 [Steam Tracker] ระบบติดตามเกมมาใหม่ Steam พร้อมทำงานแล้ว!');

    // รัน Steam Tracker ครั้งแรก
    checkAndAnnounceSteamGames(client);

    // ตั้งเวลา Cron job
    cron.schedule('0 */2 * * *', () => {
        console.log('🔄 [Steam Tracker] กำลังตรวจสอบเกม Steam มาใหม่...');
        checkAndAnnounceSteamGames(client);
    });
});

// Event อื่นๆ เช่น interactionCreate (สำหรับ Slash Commands) หรือ messageCreate วางต่อตรงนี้ได้เลย
client.on('interactionCreate', async interaction => {
    // โค้ดรับ Slash Command ของคุณ
});

client.login('YOUR_BOT_TOKEN');
