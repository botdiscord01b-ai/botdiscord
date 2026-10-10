const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');

const GAME_CHANNEL_ID = '1554496562128883742'; // ห้องสำหรับส่งข่าวสารเกม

// -------------------------------------------------------------------------
// 🎮 1. STEAM TRACKER CONFIG & FUNCTIONS
// -------------------------------------------------------------------------
const notifiedSteamGames = new Set();
const MAX_STORED_STEAM = 500;
let isSteamFirstRun = true;

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
        const channel = await client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const games = await fetchSteamTrending();
        if (!games.length) return;

        if (isSteamFirstRun) {
            for (const game of games) {
                notifiedSteamGames.add(game.id);
            }
            isSteamFirstRun = false;
            console.log(`✅ [Steam Tracker] โหลดรายการเกมเริ่มต้นเรียบร้อย (${notifiedSteamGames.size} รายการ)`);
            return;
        }

        let sendCount = 0;
        const MAX_SEND_PER_CHECK = 2;

        for (const game of games) {
            if (notifiedSteamGames.has(game.id)) continue;

            notifiedSteamGames.add(game.id);
            if (notifiedSteamGames.size > MAX_STORED_STEAM) {
                const firstItem = notifiedSteamGames.values().next().value;
                notifiedSteamGames.delete(firstItem);
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


// -------------------------------------------------------------------------
// 🎁 2. EPIC GAMES TRACKER CONFIG & FUNCTIONS
// -------------------------------------------------------------------------
const notifiedEpicGames = new Set();
const MAX_STORED_EPIC = 200;
let isEpicFirstRun = true;

async function fetchEpicFreeGames() {
    try {
        const response = await fetch('https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=th&country=TH&allowCountries=TH');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        const elements = data.data?.Catalog?.searchStore?.elements || [];
        return elements.filter(game => {
            const promotions = game.promotions?.promotionalOffers?.[0]?.promotionalOffers || [];
            if (promotions.length === 0) return false;
            const price = game.price?.totalPrice?.discountPrice;
            return price === 0;
        });
    } catch (error) {
        console.error('❌ [Epic Games API Error]:', error.message);
        return [];
    }
}

async function checkAndAnnounceEpicGames(client) {
    try {
        const channel = await client.channels.fetch(GAME_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const games = await fetchEpicFreeGames();
        if (!games.length) return;

        if (isEpicFirstRun) {
            for (const game of games) {
                notifiedEpicGames.add(game.id || game.title);
            }
            isEpicFirstRun = false;
            console.log(`✅ [Epic Games Tracker] โหลดรายการเกมแจกฟรีเริ่มต้นเรียบร้อย (${notifiedEpicGames.size} รายการ)`);
            return;
        }

        let sendCount = 0;
        const MAX_SEND_PER_CHECK = 2;

        for (const game of games) {
            const gameId = game.id || game.title;
            if (notifiedEpicGames.has(gameId)) continue;

            notifiedEpicGames.add(gameId);
            if (notifiedEpicGames.size > MAX_STORED_EPIC) {
                const firstItem = notifiedEpicGames.values().next().value;
                notifiedEpicGames.delete(firstItem);
            }

            sendCount++;

            const gameTitle = game.title;
            const imageObj = game.keyImages?.find(img => img.type === 'OfferImageWide' || img.type === 'Thumbnail') || game.keyImages?.[0];
            const imageUrl = imageObj ? imageObj.url : '';
            const originalPrice = game.price?.totalPrice?.fmtPrice?.originalPrice || 'ไม่ระบุ';
            const gameSlug = game.productSlug || game.urlSlug || (game.catalogNs?.mappings?.[0]?.pageSlug);
            const epicStoreUrl = gameSlug ? `https://store.epicgames.com/th/p/${gameSlug}` : 'https://store.epicgames.com/th/';

            const embed = new EmbedBuilder()
                .setColor(0x2a2a2a)
                .setAuthor({
                    name: 'EPIC GAMES STORE • FREE GAME',
                    iconURL: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Epic_Games_logo.svg'
                })
                .setTitle(`🎁 ${gameTitle}`)
                .setURL(epicStoreUrl)
                .setDescription(`✨ **เกมลิขสิทธิ์แท้แจกฟรีเวลาจำกัด รีบกดรับเข้าคลังด่วน!**`)
                .addFields(
                    { name: '💰 ราคาปกติ', value: `~~${originalPrice}~~ ➔ **ฟรี 0 บาท**`, inline: true },
                    { name: '🌟 แพลตฟอร์ม', value: '💻 PC (Epic Games Store)', inline: true }
                )
                .setImage(imageUrl)
                .setTimestamp()
                .setFooter({ text: 'Epic Games Free Tracker • MasaruBot', iconURL: client.user.displayAvatarURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('รับเกมฟรีบน Epic Games')
                    .setStyle(ButtonStyle.Link)
                    .setURL(epicStoreUrl)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setLabel('ค้นหารีวิวบน YouTube')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(gameTitle + ' review game')}`)
                    .setEmoji('🔍')
            );

            await channel.send({ embeds: [embed], components: [row] });
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (sendCount >= MAX_SEND_PER_CHECK) break;
        }
    } catch (error) {
        console.error('❌ [Epic Games Module Error]:', error);
    }
}


// -------------------------------------------------------------------------
// 🚀 3. EXPORT FUNCTION TO READY.JS
// -------------------------------------------------------------------------
module.exports = {
    initGameTrackers(client) {
        console.log('🎮 [Game Trackers] ระบบติดตามเกม Steam และ Epic Games พร้อมทำงานแล้ว!');
        
        // รันเช็กครั้งแรกตอนบอทเปิด
        checkAndAnnounceSteamGames(client);
        checkAndAnnounceEpicGames(client);

        // ตั้งเวลา Cron Job แยกกันหรือรวมกันตามสะดวก
        // 1. เช็ก Steam ทุก 2 ชั่วโมง
        cron.schedule('0 */2 * * *', () => {
            console.log('🔄 [Steam Tracker] กำลังตรวจสอบเกม Steam มาใหม่...');
            checkAndAnnounceSteamGames(client);
        });

        // 2. เช็ก Epic Games ทุก 3 ชั่วโมง
        cron.schedule('0 */3 * * *', () => {
            console.log('🔄 [Epic Games Tracker] กำลังตรวจสอบเกมแจกฟรี...');
            checkAndAnnounceEpicGames(client);
        });
    }
};
