const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

// ID ห้องสำหรับส่งข่าวสารเกม Steam
const STEAM_CHANNEL_ID = '1554496562128883742';

// ชุดข้อมูลเก็บ AppID เกมที่เคยแจ้งเตือนไปแล้ว (ป้องกันการส่งซ้ำ)
const notifiedGames = new Set();

/**
 * ดึงข้อมูลเกมมาใหม่และฮิตติดท็อปจาก Steam Storefront API
 */
async function fetchSteamTrending() {
    try {
        // ดึงข้อมูลภาษาไทย / สกุลเงินบาท (cc=th&l=thai)
        const response = await axios.get('https://store.steampowered.com/api/featuredcategories?cc=th&l=thai', {
            timeout: 10000
        });
        
        // ดึงรายการเกมมาใหม่และติดอันดับ (new_releases หรือ top_sellers)
        const items = response.data.new_releases?.items || [];
        return items;
    } catch (error) {
        console.error('❌ [Steam API Error]:', error.message);
        return [];
    }
}

/**
 * ฟังก์ชันสร้างและส่ง Embed การ์ดเกมไปยัง Discord
 */
async function checkAndAnnounceSteamGames(client) {
    try {
        const channel = await client.channels.fetch(STEAM_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.error(`❌ [Steam Module] ไม่พบห้อง ID: ${STEAM_CHANNEL_ID}`);
            return;
        }

        const games = await fetchSteamTrending();
        if (!games.length) return;

        // ดึงเฉพาะ 5 เกมแรกที่เป็นรายการใหม่
        for (const game of games) {
            if (notifiedGames.has(game.id)) continue;

            // บันทึกว่าส่งแล้ว
            notifiedGames.add(game.id);

            // จัดการเรื่องราคาและส่วนลด
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

            // 🎨 สร้าง Embed แสดงผลการ์ดเกมแบบพรีเมียม
            const embed = new EmbedBuilder()
                .setColor(0x1b2838) // สีธีมหลัก Steam Dark Blue
                .setAuthor({
                    name: 'STEAM STORE • NEW & TRENDING',
                    iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/768px-Steam_icon_logo.svg.png'
                })
                .setTitle(`🎮 ${game.name}`)
                .setURL(steamStoreUrl)
                .setDescription(
                    `✨ **เกมมาใหม่กำลังฮิตติดชาร์ตบน Steam!**\n` +
                    `อย่าวัดดวงกับเกมเก่าน่าเบื่อ ลองเช็กรายละเอียดเกมใหม่ล่าสุดนี้ได้เลย${discountBadge}`
                )
                .addFields(
                    { 
                        name: '💰 ราคาปัจจุบัน', 
                        value: priceText, 
                        inline: true 
                    },
                    { 
                        name: '🌟 หมวดหมู่ / แพลตฟอร์ม', 
                        value: game.streaming_video ? '🎥 วิดีโอ/สื่อ' : '💻 PC (Windows / Steam)', 
                        inline: true 
                    }
                )
                .setImage(headerImageUrl)
                .setTimestamp()
                .setFooter({ 
                    text: 'Steam Live Tracker • MasaruBot', 
                    iconURL: client.user.displayAvatarURL() 
                });

            // 🔘 ปุ่มกดสำหรับเข้าดูบน Steam และดูคะแนนรีวิว
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
            
            // ชะลอเวลาส่งทีละนิดเพื่อป้องกัน Rate Limit ของ Discord
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error('❌ [Steam Module Error]:', error);
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log('🎮 [Steam Tracker] ระบบติดตามเกมมาใหม่ Steam พร้อมทำงานแล้ว!');

        // รันเช็กครั้งแรกทันทีที่เปิดบอท
        checkAndAnnounceSteamGames(client);

        // ตั้งเวลาอัปเดตอัตโนมัติทุกๆ 1 ชั่วโมง (ปรับแต่งได้ตามต้องการ)
        cron.schedule('0 * * * *', () => {
            console.log('🔄 [Steam Tracker] กำลังตรวจสอบเกม Steam มาใหม่...');
            checkAndAnnounceSteamGames(client);
        });
    }
};
