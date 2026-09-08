const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // 1. จัดการกรณีที่เป็น Slash Commands (คำสั่ง /setup สำหรับส่งเมนูแยกเองถ้าต้องการ)
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
                const roleIds = [
                    '1356148472851726437',
                    '1538468356049477664',
                    '1462774552726606017'
                ];
                const emojis = ['🎮', '🔥', '🏆'];
                const options = [];

                for (let i = 0; i < roleIds.length; i++) {
                    const roleId = roleIds[i];
                    const role = guild.roles.cache.get(roleId);
                    const roleName = role ? role.name : `ยศ (${roleId})`;

                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(roleName)
                            .setDescription(`เลือกรับยศ ${roleName}`)
                            .setValue(roleId)
                            .setEmoji(emojis[i] || '⭐')
                    );
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_role_menu')
                    .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.reply({
                    content: '📌 **ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์**\nกรุณาเลือกยศจากเมนูด้านล่างเพื่อกรอกข้อมูลครับ!',
                    components: [row],
                });
                return;
            }

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการรันคำสั่ง', ephemeral: true });
                }
            }
            return;
        }

        // 2. จัดการเมื่อผู้ใช้เลือกยศจากเมนู (String Select Menu)
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_role_menu') {
                const requiredRoom = '1486030638464237631';
                if (interaction.channelId !== requiredRoom) {
                    return await interaction.reply({ content: `❌ กรุณาใช้งานในห้อง <#${requiredRoom}> เท่านั้นครับ!`, ephemeral: true });
                }

                const selectedRoleId = interaction.values[0];

                try {
                    const modal = new ModalBuilder()
                        .setCustomId(`server_register_modal_${selectedRoleId}`)
                        .setTitle('ลงทะเบียนรับยศ & ตรวจสอบ VAC');

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

                    await interaction.showModal(modal);
                } catch (error) {
                    console.error('❌ Error showing modal:', error);
                }
                return;
            }
        }

        // 3. จัดการตอนกดยืนยันข้อมูลใน Modal Submit (ดึง Role ID จาก CustomId ที่แนบมา)
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('server_register_modal_')) {
                await interaction.deferReply({ ephemeral: true });

                const roleId = interaction.customId.split('_')[3]; // ดึง Role ID ออกมาจาก CustomId
                const newNickname = interaction.fields.getTextInputValue('modal_nickname');
                const steamId = interaction.fields.getTextInputValue('modal_steam_id').trim();

                // ตรวจสอบ Steam ID64 (17 หลัก)
                const steamIdRegex = /^\d{17}$/;
                if (!steamIdRegex.test(steamId)) {
                    return await interaction.editReply({
                        content: '❌ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลักเท่านั้น'
                    });
                }

                const member = interaction.member;
                const guild = interaction.guild;

                try {
                    // 1. ดึงข้อมูล VAC ผ่าน Steam Web API
                    const apiKey = process.env.STEAM_API_KEY;
                    let vacStatus = '🟢 ไม่พบ VAC Ban';
                    let vacBansCount = 0;
                    let gameBansCount = 0;

                    if (apiKey) {
                        try {
                            const fetch = (await import('node-fetch')).default;
                            const response = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`);
                            const data = await response.json();
                            
                            if (data && data.players && data.players.length > 0) {
                                const player = data.players[0];
                                vacBansCount = player.NumberOfVACBans || 0;
                                gameBansCount = player.NumberOfGameBans || 0;

                                if (vacBansCount > 0 || gameBansCount > 0) {
                                    vacStatus = '🔴 พบประวัติแบน (VAC / Game Ban)';
                                }
                            }
                        } catch (apiError) {
                            console.error('❌ Error fetching Steam API:', apiError);
                        }
                    }

                    // 2. ค้นหายศตาม ID ที่เลือก
                    const targetRole = guild.roles.cache.get(roleId);
                    if (!targetRole) {
                        return await interaction.editReply({
                            content: '❌ ไม่พบยศนี้ในระบบเซิร์ฟเวอร์ กรุณาติดต่อแอดมิน'
                        });
                    }

                    // 3. เปลี่ยนชื่อเล่นและเพิ่มยศ
                    await member.setNickname(newNickname);
                    await member.roles.add(targetRole.id);

                    // 4. เวลาปัจจุบันในรูปแบบไทย
                    const now = new Date();
                    const formattedDate = now.toLocaleDateString('th-TH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }) + ' ' + now.toLocaleTimeString('th-TH', { hour12: false });

                    // 5. ส่ง Log ไปห้อง 1538429606409928815 (ห้องแจ้งผลสมาชิกรับยศเกม)
                    const logChannel1 = guild.channels.cache.get('1538429606409928815');
                    if (logChannel1) {
                        const logMessage1 = 
`# 🟢 สมาชิกรับยศเกม

- ชื่อดิสคอร์ด: ${member.user.username}
- Discord User ID: ${member.id}
- ชื่อในเซิร์ฟ: ${newNickname}
- Steam ID64: ${steamId}
- Steam Profile: https://steamcommunity.com/profiles/${steamId}
- VAC: ${vacStatus}
- VAC Ban: ${vacBansCount}
- Game Ban: ${gameBansCount}
- ยศที่ได้รับ: ${targetRole.name}
- Role ID: ${roleId}
- เวลา: ${formattedDate}`;

                        await logChannel1.send(logMessage1);
                    }

                    // 6. ส่ง Log ลงทะเบียนไปห้อง 1494379391327928370
                    const logChannel2 = guild.channels.cache.get('1494379391327928370');
                    if (logChannel2) {
                        const logMessage2 = 
`# 📝 บันทึกข้อมูลการลงทะเบียน
- ผู้ใช้งาน: <@${member.id}> (${member.user.tag})
- เปลี่ยนชื่อเป็น: **${newNickname}**
- Steam ID: \`${steamId}\`
- ได้รับยศ: **${targetRole.name}** (ID: ${roleId})
- เวลา: ${formattedDate}`;

                        await logChannel2.send(logMessage2);
                    }

                    await interaction.editReply({ 
                        content: `✅ **ลงทะเบียนสำเร็จเรียบร้อย!**\n- เปลี่ยนชื่อเป็น: **${newNickname}**\n- รับยศ: **${targetRole.name}** เรียบร้อยแล้วครับ` 
                    });

                } catch (error) {
                    console.error('❌ Error processing registration modal:', error);
                    await interaction.editReply({ 
                        content: '❌ เกิดข้อผิดพลาดในการเปลี่ยนชื่อหรือเพิ่มยศ (ตรวจสอบสิทธิ์ Manage Roles / Nicknames และตำแหน่งยศของบอท)' 
                    });
                }
                return;
            }
        }
    },
};
