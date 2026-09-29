const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// ID ห้องคำสั่งแอดมินที่อนุญาตให้ใช้งาน
const ADMIN_COMMAND_CHANNEL_ID = '1554545385471741982';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkvac')
        .setDescription('🔍 ตรวจสอบประวัติ VAC Ban และเกมที่โดนแบนของสมาชิก (เฉพาะแอดมิน)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('steamid')
                .setDescription('กรอก Steam ID64 (17 หลัก) ที่ต้องการเช็ก')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('แท็กสมาชิกในเซิร์ฟเวอร์ (เลือกได้เพื่อดูข้อมูลคู่กัน)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // ตรวจสอบว่าใช้งานตรงห้องที่กำหนดหรือไม่
        if (interaction.channelId !== ADMIN_COMMAND_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ คำสั่งนี้อนุญาตให้ใช้เฉพาะในห้อง <#${ADMIN_COMMAND_CHANNEL_ID}> เท่านั้น`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const steamId = interaction.options.getString('steamid').trim();
        const targetUser = interaction.options.getUser('user');

        // ตรวจสอบรูปแบบ Steam ID64
        if (!/^\d{17}$/.test(steamId)) {
            return await interaction.editReply({ content: '❌ รูปแบบ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลัก' });
        }

        const apiKey = process.env.STEAM_API_KEY;
        if (!apiKey) {
            return await interaction.editReply({ content: '❌ ไม่พบ STEAM_API_KEY ในระบบ env' });
        }

        try {
            // 1. ดึงข้อมูล Ban จาก Steam API
            const banRes = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`);
            const banData = await banRes.json();

            if (!banData?.players?.length) {
                return await interaction.editReply({ content: '❌ ไม่พบข้อมูลโปรไฟล์ Steam นี้ในระบบ' });
            }

            const player = banData.players[0];
            const vacBansCount = player.NumberOfVACBans || 0;
            const gameBansCount = player.NumberOfGameBans || 0;
            const daysSinceLastBan = player.DaysSinceLastBan || 0;
            const communityBanned = player.CommunityBanned ? '🔴 ถูกแบน' : '🟢 ปกติ';

            let vacStatus = '🟢 ไม่พบประวัติแบน (Clean)';
            let bannedGamesList = [];

            if (vacBansCount > 0 || gameBansCount > 0) {
                vacStatus = `🔴 พบประวัติแบน (${daysSinceLastBan} วันที่แล้ว)`;

                // 2. ดึงชื่อเกมที่ถูกแบนจากหน้าโปรไฟล์ Steam
                try {
                    const profileRes = await fetch(`https://steamcommunity.com/profiles/${steamId}?l=english`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const htmlText = await profileRes.text();

                    const banBlockMatch = htmlText.match(/class="ban_info"[\s\S]*?<\/div>/i);
                    if (banBlockMatch) {
                        const gameMatches = [...banBlockMatch[0].matchAll(/on record for ([^<.]+)/gi)];
                        bannedGamesList = gameMatches.map(m => m[1].trim());
                    }
                } catch (scrapeErr) {
                    console.error('❌ Error fetching Steam profile page:', scrapeErr);
                }
            }

            // จัดรูปแบบรายชื่อเกม
            const bannedGamesText = bannedGamesList.length > 0
                ? bannedGamesList.map(g => `• ${g}`).join('\n')
                : (vacBansCount > 0 || gameBansCount > 0 ? '🔒 โปรไฟล์ตั้งค่าเป็นส่วนตัว (ไม่สามารถดึงชื่อเกมได้)' : 'ไม่มี');

            // 3. ดึงชื่อโปรไฟล์ Steam เพิ่มเติม
            let playerSummaryName = steamId;
            let avatarUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/768px-Steam_icon_logo.svg.png';
            try {
                const userRes = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`);
                const userData = await userRes.json();
                if (userData?.response?.players?.length > 0) {
                    playerSummaryName = userData.response.players[0].personaname;
                    avatarUrl = userData.response.players[0].avatarfull || avatarUrl;
                }
            } catch (e) { }

            // 4. สร้าง Embed รายงานผล
            const embed = new EmbedBuilder()
                .setColor(vacBansCount > 0 || gameBansCount > 0 ? 0xED4245 : 0x57F287)
                .setTitle(`🔍 ผลการตรวจสอบ VAC Ban: ${playerSummaryName}`)
                .setURL(`https://steamcommunity.com/profiles/${steamId}`)
                .setThumbnail(avatarUrl)
                .addFields(
                    { name: '👤 สมาชิกในดิสคอร์ด', value: targetUser ? `${targetUser} (${targetUser.tag})` : 'ไม่ได้ระบุ', inline: false },
                    { name: '🆔 Steam ID64', value: `\`${steamId}\``, inline: true },
                    { name: '🛡️ สถานะ VAC/Game Ban', value: vacStatus, inline: true },
                    { name: '📊 จำนวนการถูกแบน', value: `• VAC Ban: **${vacBansCount}** ครั้ง\n• Game Ban: **${gameBansCount}** ครั้ง\n• Community Ban: **${communityBanned}**`, inline: false },
                    { name: '🎮 รายชื่อเกมที่ถูกแบน', value: bannedGamesText, inline: false }
                )
                .setFooter({ text: 'ระบบรีเช็ก VAC Ban ย้อนหลัง • MasaruBot' })
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error in /checkvac command:', error);
            return await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ Steam API' });
        }
    }
};
