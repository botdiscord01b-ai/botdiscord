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

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // =========================================================
        // 1. Slash Command /setup
        // =========================================================
        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'setup') {

                // ตรวจสอบสิทธิ์ Administrator
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return await interaction.reply({
                        content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้',
                        ephemeral: true
                    });
                }

                // ห้องที่อนุญาตให้ใช้ /setup
                const targetChannelId = '1486030638464237631';

                if (interaction.channelId !== targetChannelId) {
                    return await interaction.reply({
                        content: `❌ คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${targetChannelId}> เท่านั้น`,
                        ephemeral: true
                    });
                }

                const guild = interaction.guild;

                // =====================================================
                // Role ID
                // =====================================================
                const roleIds = [
                    '1356148472851726437',
                    '1538468356049477664',
                    '1462774552726606017'
                ];

                // Emoji ของแต่ละยศ
                const emojis = [
                    '🎮',
                    '🔥',
                    '🏆'
                ];

                const options = [];

                // =====================================================
                // สร้างตัวเลือก Role
                // =====================================================
                for (let i = 0; i < roleIds.length; i++) {

                    const roleId = roleIds[i];

                    const role = guild.roles.cache.get(roleId);

                    const roleName = role
                        ? role.name
                        : `ยศ (${roleId})`;

                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(roleName)
                            .setDescription(`เลือกรับยศ ${roleName}`)
                            .setValue(roleId)
                            .setEmoji(emojis[i] || '⭐')
                    );
                }

                // =====================================================
                // Select Menu
                // =====================================================
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_role_menu')
                    .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
                    .addOptions(options);

                const row = new ActionRowBuilder()
                    .addComponents(selectMenu);

                // =====================================================
                // โหลดรูป register.png
                //
                // register.png อยู่ข้าง index.js
                // แต่ interactionCreate.js อยู่ใน events/
                // จึงใช้ ../register.png
                // =====================================================
                const imagePath = path.join(
                    __dirname,
                    '../register.png'
                );

                const attachment = new AttachmentBuilder(
                    imagePath,
                    {
                        name: 'register.png'
                    }
                );

                // =====================================================
                // Embed หน้าลงทะเบียน
                // =====================================================
                const embed = new EmbedBuilder()
                    .setColor('#8B7CFF')
                    .setTitle('💜 ห้องลงทะเบียน Discord')
                    .setDescription(
                        'ยินดีต้อนรับเข้าสู่ระบบลงทะเบียนสมาชิกครับ! 💕\n\n' +
                        'กรุณาเลือก **ยศที่ต้องการรับ** จากเมนูด้านล่าง\n' +
                        'จากนั้นกรอกข้อมูลเพื่อดำเนินการลงทะเบียน\n\n' +
                        '✨ ระบบจะตรวจสอบ Steam ID64 และประวัติ VAC / Game Ban ให้อัตโนมัติ'
                    )
                    .setImage('attachment://register.png')
                    .setFooter({
                        text: 'Discord Registration System • กรุณากรอกข้อมูลให้ถูกต้อง'
                    })
                    .setTimestamp();

                // =====================================================
                // ส่ง Embed + รูป + เมนู
                // =====================================================
                await interaction.reply({
                    embeds: [embed],
                    files: [attachment],
                    components: [row]
                });

                return;
            }

            // =====================================================
            // Slash Command อื่น ๆ
            // =====================================================
            const command = interaction.client.commands.get(
                interaction.commandName
            );

            if (!command) return;

            try {

                await command.execute(interaction);

            } catch (error) {

                console.error(error);

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ เกิดข้อผิดพลาดในการรันคำสั่ง',
                        ephemeral: true
                    });
                }
            }

            return;
        }


        // =========================================================
        // 2. ผู้ใช้เลือก Role จาก Select Menu
        // =========================================================
        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'select_role_menu') {

                const requiredRoom = '1486030638464237631';

                if (interaction.channelId !== requiredRoom) {
                    return await interaction.reply({
                        content: `❌ กรุณาใช้งานในห้อง <#${requiredRoom}> เท่านั้นครับ!`,
                        ephemeral: true
                    });
                }

                const selectedRoleId = interaction.values[0];

                try {

                    // =================================================
                    // สร้าง Modal
                    // =================================================
                    const modal = new ModalBuilder()
                        .setCustomId(
                            `server_register_modal_${selectedRoleId}`
                        )
                        .setTitle('ลงทะเบียนรับยศ & ตรวจสอบ VAC');

                    // =================================================
                    // ช่องชื่อ Discord
                    // =================================================
                    const nicknameInput = new TextInputBuilder()
                        .setCustomId('modal_nickname')
                        .setLabel('ชื่อในดิสคอร์ด')
                        .setPlaceholder(
                            'กรอกชื่อเล่นหรือชื่อที่ต้องการเปลี่ยน'
                        )
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(32);

                    // =================================================
                    // ช่อง Steam ID64
                    // =================================================
                    const steamInput = new TextInputBuilder()
                        .setCustomId('modal_steam_id')
                        .setLabel('Steam ID64 (17 หลัก)')
                        .setPlaceholder('76561198445731318')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(17)
                        .setMaxLength(17);

                    // =================================================
                    // เพิ่มช่องเข้า Modal
                    // =================================================
                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(nicknameInput),

                        new ActionRowBuilder()
                            .addComponents(steamInput)
                    );

                    // แสดง Modal
                    await interaction.showModal(modal);

                } catch (error) {

                    console.error(
                        '❌ Error showing modal:',
                        error
                    );

                }

                return;
            }
        }


        // =========================================================
        // 3. Modal Submit
        // =========================================================
        if (interaction.isModalSubmit()) {

            if (
                interaction.customId.startsWith(
                    'server_register_modal_'
                )
            ) {

                await interaction.deferReply({
                    ephemeral: true
                });

                // =====================================================
                // ดึง Role ID จาก Custom ID
                // =====================================================
                const roleId =
                    interaction.customId.split('_')[3];

                // =====================================================
                // รับข้อมูลจาก Modal
                // =====================================================
                const newNickname =
                    interaction.fields
                        .getTextInputValue('modal_nickname')
                        .trim();

                const steamId =
                    interaction.fields
                        .getTextInputValue('modal_steam_id')
                        .trim();

                // =====================================================
                // ตรวจสอบ Steam ID64
                // =====================================================
                const steamIdRegex = /^\d{17}$/;

                if (!steamIdRegex.test(steamId)) {

                    return await interaction.editReply({
                        content:
                            '❌ **Steam ID64 ไม่ถูกต้อง!**\n' +
                            'กรุณากรอกเป็นตัวเลข 17 หลักเท่านั้น'
                    });

                }

                const member = interaction.member;
                const guild = interaction.guild;

                try {

                    // =================================================
                    // 1. ตรวจสอบ VAC ผ่าน Steam Web API
                    // =================================================
                    const apiKey =
                        process.env.STEAM_API_KEY;

                    let vacStatus =
                        '🟢 ไม่พบ VAC Ban';

                    let vacBansCount = 0;

                    let gameBansCount = 0;

                    if (apiKey) {

                        try {

                            const fetch =
                                (await import('node-fetch')).default;

                            const response = await fetch(
                                `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`
                            );

                            if (!response.ok) {
                                throw new Error(
                                    `Steam API HTTP ${response.status}`
                                );
                            }

                            const data =
                                await response.json();

                            if (
                                data &&
                                data.players &&
                                data.players.length > 0
                            ) {

                                const player =
                                    data.players[0];

                                vacBansCount =
                                    player.NumberOfVACBans || 0;

                                gameBansCount =
                                    player.NumberOfGameBans || 0;

                                if (
                                    vacBansCount > 0 ||
                                    gameBansCount > 0
                                ) {

                                    vacStatus =
                                        '🔴 พบประวัติแบน (VAC / Game Ban)';

                                }
                            }

                        } catch (apiError) {

                            console.error(
                                '❌ Error fetching Steam API:',
                                apiError
                            );

                        }
                    }


                    // =================================================
                    // 2. ค้นหา Role
                    // =================================================
                    const targetRole =
                        guild.roles.cache.get(roleId);

                    if (!targetRole) {

                        return await interaction.editReply({
                            content:
                                '❌ ไม่พบยศนี้ในระบบเซิร์ฟเวอร์\n' +
                                'กรุณาติดต่อแอดมิน'
                        });

                    }


                    // =================================================
                    // 3. เปลี่ยนชื่อ + เพิ่ม Role
                    // =================================================
                    await member.setNickname(
                        newNickname
                    );

                    await member.roles.add(
                        targetRole.id
                    );


                    // =================================================
                    // 4. เวลาปัจจุบัน
                    // =================================================
                    const now = new Date();

                    const formattedDate =
                        now.toLocaleDateString(
                            'th-TH',
                            {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }
                        ) +
                        ' ' +
                        now.toLocaleTimeString(
                            'th-TH',
                            {
                                hour12: false
                            }
                        );


                    // =================================================
                    // 5. Log ห้องรับยศเกม
                    // =================================================
                    const logChannel1 =
                        guild.channels.cache.get(
                            '1538429606409928815'
                        );

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

                        await logChannel1.send(
                            logMessage1
                        );
                    }


                    // =================================================
                    // 6. Log ห้องลงทะเบียน
                    // =================================================
                    const logChannel2 =
                        guild.channels.cache.get(
                            '1494379391327928370'
                        );

                    if (logChannel2) {

                        const logMessage2 =
`# 📝 บันทึกข้อมูลการลงทะเบียน

- ผู้ใช้งาน: <@${member.id}> (${member.user.tag})
- เปลี่ยนชื่อเป็น: **${newNickname}**
- Steam ID: \`${steamId}\`
- ได้รับยศ: **${targetRole.name}** (ID: ${roleId})
- เวลา: ${formattedDate}`;

                        await logChannel2.send(
                            logMessage2
                        );
                    }


                    // =================================================
                    // 7. แจ้งสมาชิกว่าลงทะเบียนสำเร็จ
                    // =================================================
                    await interaction.editReply({

                        content:
                            `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
                            `       💜 **ลงทะเบียนสำเร็จ!**\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                            `👤 ชื่อในเซิร์ฟ: **${newNickname}**\n` +
                            `🎖️ ยศที่ได้รับ: **${targetRole.name}**\n` +
                            `🎮 Steam ID64: \`${steamId}\`\n\n` +
                            `✨ ขอบคุณที่เข้าร่วมเซิร์ฟเวอร์ครับ!`

                    });

                } catch (error) {

                    console.error(
                        '❌ Error processing registration modal:',
                        error
                    );

                    await interaction.editReply({

                        content:
                            '❌ **เกิดข้อผิดพลาดในการลงทะเบียน**\n\n' +
                            'กรุณาตรวจสอบว่า Bot มีสิทธิ์:\n' +
                            '• Manage Nicknames\n' +
                            '• Manage Roles\n' +
                            '• ตำแหน่ง Role ของ Bot อยู่สูงกว่า Role ที่จะแจก\n\n' +
                            'หากยังมีปัญหา กรุณาติดต่อแอดมิน'

                    });
                }

                return;
            }
        }
    }
};
