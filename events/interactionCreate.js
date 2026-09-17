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

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // =========================================================
        // 1. SLASH COMMAND (/setup)
        // =========================================================
        if (interaction.isChatInputCommand()) {
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
                        '🎮 **วิธีใช้งาน:** เลือกยศที่ต้องการจากเมนูด้านล่างแล้วกรอกข้อมูลตามที่ระบบร้องขอ'
                    )
                    .setImage('attachment://register.png')
                    .setFooter({ text: 'ระบบลงทะเบียนอัตโนมัติ' });

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

            const command = interaction.client.commands?.get(interaction.commandName);
            if (command) await command.execute(interaction);
            return;
        }

        // =========================================================
        // 2. SELECT MENU (เปิด Modal ให้ผู้ใช้กรอก)
        // =========================================================
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_role_menu') {
            const selectedValue = interaction.values[0];

            // --- A. เลือกยศชั่วคราว (กรอกเฉพาะชื่อ) ---
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

            // --- B. เลือกยศถาวร (กรอกชื่อ + Steam ID) ---
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
        // 3. MODAL SUBMIT (ประมวลผลข้อมูล)
        // =========================================================
        if (interaction.isModalSubmit()) {

            // -----------------------------------------------------
            // 3.1 ยศชั่วคราว (ไม่ต้องตรวจ Steam ID)
            // -----------------------------------------------------
            if (interaction.customId === 'modal_temp_role') {
                await interaction.deferReply({ ephemeral: true });

                const newNickname = interaction.fields.getTextInputValue('modal_nickname');
                const member = interaction.member;
                const guild = interaction.guild;
                const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);

                if (!tempRole) {
                    return await interaction.editReply({ content: '❌ ไม่พบยศชั่วคราวในระบบ กรุณาติดต่อแอดมิน' });
                }

                // เปลี่ยนชื่อ
                let nickChanged = true;
                try { await member.setNickname(newNickname); } catch (e) { nickChanged = false; }

                // ให้ยศชั่วคราว
                await member.roles.add(tempRole.id);

                // ตั้งเวลาถอดยศใน 24 ชั่วโมง
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

                // Log แจ้งเตือน
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

            // -----------------------------------------------------
            // 3.2 ยศถาวร (ตรวจ Steam ID64 + VAC Ban)
            // -----------------------------------------------------
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

                // ตรวจ VAC
                const apiKey = process.env.STEAM_API_KEY;
                let vacStatus = '🟢 ไม่พบ VAC Ban';
                let vacBansCount = 0;
                let gameBansCount = 0;

                if (apiKey) {
                    try {
                        const fetch = (await import('node-fetch')).default;
                        const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`);
                        const data = await res.json();
                        if (data?.players?.length > 0) {
                            const player = data.players[0];
                            vacBansCount = player.NumberOfVACBans || 0;
                            gameBansCount = player.NumberOfGameBans || 0;
                            if (vacBansCount > 0 || gameBansCount > 0) {
                                vacStatus = '🔴 พบประวัติแบน (VAC / Game Ban)';
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

                // เปลี่ยนชื่อ
                let nickChanged = true;
                try { await member.setNickname(newNickname); } catch (e) { nickChanged = false; }

                // เพิ่มยศถาวร
                await member.roles.add(targetRole.id);

                const now = new Date();
                const formattedDate = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour12: false });

                // LOG 1
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
                        `- ยศถาวรที่ได้รับ: ${targetRole.name}\n` +
                        `- เวลา: ${formattedDate}\n` +
                        '```'
                    );
                }

                // LOG 2
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
