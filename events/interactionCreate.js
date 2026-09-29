const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const path = require('path');

const TEMP_ROLE_ID = '1550062346435567657';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน (มิลลิวินาที)

// Map สำหรับเก็บบันทึกเวลาทำกิจกรรมล่าสุดของสมาชิก (UserId -> Timestamp)
const lastActivityMap = new Map();

// ตัวแปรเช็คสถานะการตั้ง Cron/Interval
let isCheckLoopStarted = false;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // =========================================================
        // 0. START INACTIVE CHECKER LOOP (รันระบบเช็ค 30 วัน เมื่อเริ่มใช้งาน)
        // =========================================================
        if (!isCheckLoopStarted && interaction.client) {
            isCheckLoopStarted = true;
            const client = interaction.client;

            // บันทึกกิจกรรมจากการพิมพ์ข้อความ
            client.on('messageCreate', (message) => {
                if (message.author.bot || !message.guild) return;
                lastActivityMap.set(message.author.id, Date.now());
            });

            // บันทึกกิจกรรมจากการเข้าห้องเสียง
            client.on('voiceStateUpdate', (oldState, newState) => {
                const member = newState.member;
                if (!member || member.user.bot) return;
                if (newState.channelId) {
                    lastActivityMap.set(member.id, Date.now());
                }
            });

            // ตั้งระบบตรวจเช็คอัตโนมัติทุกๆ 24 ชั่วโมง
            setInterval(async () => {
                try {
                    const guild = client.guilds.cache.first();
                    if (!guild) return;

                    const members = await guild.members.fetch();
                    const now = Date.now();
                    const logChannel = guild.channels.cache.get('1538429606409928815');

                    for (const [id, member] of members) {
                        if (member.user.bot) continue;

                        // ยกเว้นยศแอดมินหรือยศที่ต้องการระบุ
                        const EXCLUDED_ROLE_IDS = ['1550062346435567657'];
                        if (member.roles.cache.some(r => EXCLUDED_ROLE_IDS.includes(r.id))) continue;

                        const lastActiveTime = lastActivityMap.get(id) || member.joinedTimestamp;

                        if (now - lastActiveTime > INACTIVE_LIMIT_MS) {
                            const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id);

                            if (rolesToRemove.size > 0) {
                                await member.roles.remove(rolesToRemove);
                                console.log(`🧹 ถอดยศจาก ${member.user.tag} เนื่องจากไม่แอกทีฟเกิน 30 วัน`);

                                if (logChannel) {
                                    const formattedDate = new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour12: false });
                                    await logChannel.send(
                                        '```md\n' +
                                        `# ⚠️ ถอดยศเนื่องจากไม่มีความเคลื่อนไหว (30 วัน)\n` +
                                        `- สมาชิก: ${member.user.tag} (${member.id})\n` +
                                        `- ชื่อในดิสคอร์ด: ${member.displayName}\n` +
                                        `- ยศที่ถูกถอด: ${rolesToRemove.map(r => r.name).join(', ')}\n` +
                                        `- เวลา: ${formattedDate}\n` +
                                        '```'
                                    );
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('❌ เกิดข้อผิดพลาดในระบบตรวจเช็คสมาชิกไม่ออกเสียง 30 วัน:', err);
                }
            }, 24 * 60 * 60 * 1000);
        }

        // =========================================================
        // 1. SLASH COMMANDS (เช่น /setup, /checkvac)
        // =========================================================
        if (interaction.isChatInputCommand()) {

            // --- 1.1 คำสั่ง /setup ---
            if (interaction.commandName === 'setup') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return await interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้', ephemeral: true });
                }

                const targetChannelId = '1486030638464237631';
                if (interaction.channelId !== targetChannelId) {
                    return await interaction.reply({ content: `❌ คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${targetChannelId}> เท่านั้น`, ephemeral: true });
                }

                const guild = interaction.guild;
                const roleIds = ['1356148472851726437', '1538468356049477664', '1462774552726606017'];
                const emojis = ['🎮', '🔥', '🏆'];
                const options = [];

                for (let i = 0; i < roleIds.length; i++) {
                    const role = guild.roles.cache.get(roleIds[i]);
                    const roleName = role ? role.name : `ยศ (${roleIds[i]})`;
                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`[ถาวร] ${roleName}`)
                            .setDescription(`รับยศถาวร ${roleName} (ต้องกรอก Steam ID64)`)
                            .setValue(`perm_${roleIds[i]}`)
                            .setEmoji(emojis[i] || '⭐')
                    );
                }

                const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
                const tempRoleName = tempRole ? tempRole.name : 'ยศชั่วคราว (1 วัน)';
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`[ชั่วคราว 1 วัน] ${tempRoleName}`)
                        .setDescription('รับยศทดลองใช้งาน 24 ชม. (ไม่ต้องกรอก Steam ID)')
                        .setValue('temp_role_only')
                        .setEmoji('⏰')
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_role_menu')
                    .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);
                const imagePath = path.join(__dirname, '../register.png');
                const attachment = new AttachmentBuilder(imagePath, { name: 'register.png' });

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์')
                    .setDescription(
                        'ยินดีต้อนรับเข้าสู่ระบบลงทะเบียนรับยศ\n\n' +
                        '🔰 **ข้อแตกต่างประเภทการรับยศ:**\n' +
                        '▪️ **ยศถาวร:** ต้องกรอกชื่อดิสคอร์ด + Steam ID64 (ตรวจ VAC Ban)\n' +
                        '▪️ **ยศชั่วคราว (1 วัน):** กรอกเฉพาะชื่อดิสคอร์ด (ไม่ต้องกรอก Steam ID)\n\n' +
                        '⚠️ **เงื่อนไขการรักษายศ (การถอดยศอัตโนมัติ):**\n' +
                        '• สมาชิกที่ไม่เข้าห้องเสียง หรือไม่พิมพ์ข้อความใดๆ ในเซิร์ฟเวอร์**เกิน 30 วัน** จะถูกถอดยศออกทั้งหมดโดยอัตโนมัติ\n\n' +
                        '🎮 **วิธีใช้งาน:** เลือกยศที่ต้องการจากเมนูด้านล่างแล้วกรอกข้อมูลตามที่ระบบร้องขอ'
                    )
                    .setImage('attachment://register.png')
                    .setFooter({ text: 'ระบบลงทะเบียนและรักษาสภาพสมาชิกอัตโนมัติ' });

                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 50 });
                    for (const [, msg] of messages.filter(m => m.author.id === interaction.client.user.id)) {
                        await msg.delete().catch(() => null);
                    }
                    await interaction.channel.send({ embeds: [embed], files: [attachment], components: [row] });
                } catch (error) {
                    console.error('❌ Error setup channel:', error);
                }

                return await interaction.reply({ content: '✅ อัปเดตห้องลงทะเบียนเรียบร้อยแล้ว', ephemeral: true });
            }

            // --- 1.2 คำสั่งอื่นๆ จากโฟลเดอร์ commands ---
            const command = interaction.client.commands?.get(interaction.commandName);
            if (command) {
                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`❌ เกิดข้อผิดพลาดในคำสั่ง ${interaction.commandName}:`, error);
                    const errorMsg = { content: '❌ เกิดข้อผิดพลาดขณะรันคำสั่งนี้!', ephemeral: true };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMsg);
                    } else {
                        await interaction.reply(errorMsg);
                    }
                }
            }
            return;
        }

        // =========================================================
        // 2. SELECT MENU (เปิด Modal ให้ผู้ใช้กรอก)
        // =========================================================
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_role_menu') {
            const selectedValue = interaction.values[0];

            if (selectedValue === 'temp_role_only') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_temp_role')
                    .setTitle('รับยศชั่วคราว (1 วัน)');

                const nicknameInput = new TextInputBuilder()
                    .setCustomId('modal_nickname')
                    .setLabel('ชื่อในดิสคอร์ด (ชื่อที่จะให้เปลี่ยนในเซิร์ฟ)')
                    .setPlaceholder('กรอกชื่อเล่นหรือชื่อที่ต้องการเปลี่ยน')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nicknameInput));
                return await interaction.showModal(modal);
            }

            if (selectedValue.startsWith('perm_')) {
                const roleId = selectedValue.replace('perm_', '');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_perm_role_${roleId}`)
                    .setTitle('ลงทะเบียนรับยศถาวร & ตรวจสอบ VAC');

                const nicknameInput = new TextInputBuilder()
                    .setCustomId('modal_nickname')
                    .setLabel('ชื่อในดิสคอร์ด (ชื่อที่จะให้เปลี่ยนในเซิร์ฟ)')
                    .setPlaceholder('กรอกชื่อเล่นหรือชื่อที่ต้องการเปลี่ยน')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const steamInput = new TextInputBuilder()
                    .setCustomId('modal_steam_id')
                    .setLabel('Steam ID64 (17 หลัก)')
                    .setPlaceholder('76561198445731318')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nicknameInput),
                    new ActionRowBuilder().addComponents(steamInput)
                );
                return await interaction.showModal(modal);
            }
        }

        // =========================================================
        // 3. MODAL SUBMIT (ประมวลผลข้อมูลลงทะเบียน)
        // =========================================================
        if (interaction.isModalSubmit()) {

            // --- 3.1 ยศชั่วคราว ---
            if (interaction.customId === 'modal_temp_role') {
                await interaction.deferReply({ ephemeral: true });

                const newNickname = interaction.fields.getTextInputValue('modal_nickname');
                const member = interaction.member;
                const guild = interaction.guild;
                const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);

                if (!tempRole) {
                    return await interaction.editReply({ content: '❌ ไม่พบยศชั่วคราวในระบบ กรุณาติดต่อแอดมิน' });
                }

                let nickChanged = true;
                try { await member.setNickname(newNickname); } catch (e) { nickChanged = false; }

                await member.roles.add(tempRole.id);
                lastActivityMap.set(member.id, Date.now()); // บันทึกกิจกรรมตอนลงทะเบียน

                setTimeout(async () => {
                    try {
                        const updatedMember = await guild.members.fetch(member.id).catch(() => null);
                        if (updatedMember && updatedMember.roles.cache.has(TEMP_ROLE_ID)) {
                            await updatedMember.roles.remove(TEMP_ROLE_ID);
                            console.log(`⏰ ถอดยศชั่วคราวจาก ${updatedMember.user.tag} เรียบร้อยแล้ว (ครบ 24 ชม.)`);
                        }
                    } catch (err) {
                        console.error('❌ เกิดข้อผิดพลาดในการถอดยศชั่วคราว:', err);
                    }
                }, ONE_DAY_MS);

                const now = new Date();
                const formattedDate = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour12: false });
                const logChannel = guild.channels.cache.get('1538429606409928815');
                if (logChannel) {
                    await logChannel.send(
                        '```md\n' +
                        `# ⏰ สมาชิกรับยศชั่วคราว (1 วัน)\n` +
                        `- ชื่อในเซิร์ฟ: ${newNickname}\n` +
                        `- Username: ${member.user.username}\n` +
                        `- User ID: ${member.id}\n` +
                        `- ยศที่ได้รับ: ${tempRole.name}\n` +
                        `- หมดอายุใน: 24 ชั่วโมง\n` +
                        `- เวลา: ${formattedDate}\n` +
                        '```'
                    );
                }

                let replyText = `✅ **รับยศชั่วคราวสำเร็จ!**\n`;
                replyText += nickChanged ? `- เปลี่ยนชื่อเป็น: **${newNickname}**\n` : `- เปลี่ยนชื่อ: *(สิทธิ์ของคุณสูงกว่าบอท)*\n`;
                replyText += `- ได้รับยศ: **${tempRole.name}** *(จะถูกถอดออกอัตโนมัติใน 24 ชั่วโมง)*`;

                return await interaction.editReply({ content: replyText });
            }

            // --- 3.2 ยศถาวร ---
            if (interaction.customId.startsWith('modal_perm_role_')) {
                await interaction.deferReply({ ephemeral: true });

                const roleId = interaction.customId.replace('modal_perm_role_', '');
                const newNickname = interaction.fields.getTextInputValue('modal_nickname');
                const steamId = interaction.fields.getTextInputValue('modal_steam_id').trim();

                if (!/^\d{17}$/.test(steamId)) {
                    return await interaction.editReply({ content: '❌ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลัก' });
                }

                const member = interaction.member;
                const guild = interaction.guild;

                const apiKey = process.env.STEAM_API_KEY;
                let vacStatus = '🟢 ไม่พบ VAC / Game Ban';
                let vacBansCount = 0;
                let gameBansCount = 0;
                let daysSinceLastBan = 0;
                let bannedGamesList = [];

                if (apiKey) {
                    try {
                        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`);
                        const data = await res.json();
                        
                        if (data?.players?.length > 0) {
                            const player = data.players[0];
                            vacBansCount = player.NumberOfVACBans || 0;
                            gameBansCount = player.NumberOfGameBans || 0;
                            daysSinceLastBan = player.DaysSinceLastBan || 0;

                            if (vacBansCount > 0 || gameBansCount > 0) {
                                vacStatus = `🔴 พบประวัติแบน (${daysSinceLastBan} วันที่แล้ว)`;

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
                        }
                    } catch (e) {
                        console.error('❌ Error Steam API:', e);
                    }
                }

                const targetRole = guild.roles.cache.get(roleId);
                if (!targetRole) {
                    return await interaction.editReply({ content: '❌ ไม่พบยศนี้ในระบบ กรุณาติดต่อแอดมิน' });
                }

                let nickChanged = true;
                try { await member.setNickname(newNickname); } catch (e) { nickChanged = false; }

                await member.roles.add(targetRole.id);
                lastActivityMap.set(member.id, Date.now()); // บันทึกกิจกรรมตอนลงทะเบียน

                const now = new Date();
                const formattedDate = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour12: false });

                const bannedGamesText = bannedGamesList.length > 0 
                    ? bannedGamesList.join(', ') 
                    : (vacBansCount > 0 || gameBansCount > 0 ? 'Steam ไม่เปิดเผยชื่อเกมที่ถูกแบนผ่าน API (แสดงเฉพาะจำนวนครั้ง/วัน)' : 'ไม่มี');

                const logChannel1 = guild.channels.cache.get('1538429606409928815');
                if (logChannel1) {
                    await logChannel1.send(
                        '```md\n' +
                        `# 🟢 สมาชิกรับยศถาวรและตรวจสอบ VAC\n` +
                        `- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
                        `- Username: ${member.user.username}\n` +
                        `- User ID: ${member.id}\n` +
                        `- Steam ID64: ${steamId}\n` +
                        `- Steam Profile: [https://steamcommunity.com/profiles/$](https://steamcommunity.com/profiles/$){steamId}\n` +
                        `- สถานะ VAC: ${vacStatus}\n` +
                        `- จำนวน VAC Ban: ${vacBansCount}\n` +
                        `- จำนวน Game Ban: ${gameBansCount}\n` +
                        `- เกมที่ถูกแบน: ${bannedGamesText}\n` +
                        `- ยศถาวรที่ได้รับ: ${targetRole.name}\n` +
                        `- เวลา: ${formattedDate}\n` +
                        '```'
                    );
                }

                const logChannel2 = guild.channels.cache.get('1494379391327928370');
                if (logChannel2) {
                    await logChannel2.send(
                        '```md\n' +
                        `# 📝 บันทึกข้อมูลการลงทะเบียนยศถาวร\n` +
                        `- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
                        `- Username: ${member.user.tag}\n` +
                        `- User ID: ${member.id}\n` +
                        `- Steam ID64: ${steamId}\n` +
                        `- ยศถาวรที่ได้รับ: ${targetRole.name}\n` +
                        `- เวลา: ${formattedDate}\n` +
                        '```'
                    );
                }

                let replyText = `✅ **ลงทะเบียนรับยศถาวรสำเร็จ!**\n`;
                replyText += nickChanged ? `- เปลี่ยนชื่อเป็น: **${newNickname}**\n` : `- เปลี่ยนชื่อ: *(สิทธิ์ของคุณสูงกว่าบอท)*\n`;
                replyText += `- ได้รับยศถาวร: **${targetRole.name}**`;

                return await interaction.editReply({ content: replyText });
            }
        }
    }
};
