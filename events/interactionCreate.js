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
        // 1. SLASH COMMAND
        // =========================================================
        if (interaction.isChatInputCommand()) {

            // =====================================================
            // /setup
            // =====================================================
            if (interaction.commandName === 'setup') {

                // ต้องเป็น Administrator
                if (!interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )) {
                    return await interaction.reply({
                        content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้',
                        ephemeral: true
                    });
                }

                // ห้องลงทะเบียน
                const targetChannelId = '1486030638464237631';

                if (interaction.channelId !== targetChannelId) {
                    return await interaction.reply({
                        content:
                            `❌ คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${targetChannelId}> เท่านั้น`,
                        ephemeral: true
                    });
                }

                const guild = interaction.guild;

                // =====================================================
                // ROLE ID
                // =====================================================
                const roleIds = [
                    '1356148472851726437',
                    '1538468356049477664',
                    '1462774552726606017'
                ];

                const emojis = [
                    '🎮',
                    '🔥',
                    '🏆'
                ];

                const options = [];

                for (let i = 0; i < roleIds.length; i++) {

                    const roleId = roleIds[i];

                    const role = guild.roles.cache.get(roleId);

                    const roleName = role
                        ? role.name
                        : `ยศ (${roleId})`;

                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(roleName)
                            .setDescription(
                                `เลือกรับยศ ${roleName}`
                            )
                            .setValue(roleId)
                            .setEmoji(
                                emojis[i] || '⭐'
                            )
                    );
                }

                // =====================================================
                // SELECT MENU
                // =====================================================
                const selectMenu =
                    new StringSelectMenuBuilder()
                        .setCustomId('select_role_menu')
                        .setPlaceholder(
                            '📌 กรุณาเลือกยศที่ต้องการรับที่นี่...'
                        )
                        .addOptions(options);

                const row =
                    new ActionRowBuilder()
                        .addComponents(selectMenu);


                // =====================================================
                // REGISTER IMAGE
                // =====================================================
                const imagePath =
                    path.join(__dirname, '../register.png');

                const attachment =
                    new AttachmentBuilder(imagePath, {
                        name: 'register.png'
                    });


                // =====================================================
                // EMBED
                // =====================================================
                const embed =
                    new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setTitle(
                            '📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์'
                        )
                        .setDescription(
                            'กรุณาเลือกยศที่ต้องการรับจากเมนูด้านล่าง\n\n' +
                            '🎮 เลือกยศที่ต้องการ\n' +
                            '📝 กรอกชื่อที่ต้องการใช้ในเซิร์ฟเวอร์\n' +
                            '🔎 กรอก Steam ID64 เพื่อทำการตรวจสอบ VAC\n\n' +
                            '⚠️ กรุณากรอกข้อมูลให้ถูกต้อง'
                        )
                        .setImage(
                            'attachment://register.png'
                        )
                        .setFooter({
                            text: 'ระบบลงทะเบียนอัตโนมัติ'
                        })
                        .setTimestamp();


                // =====================================================
                // ลบข้อความ Setup เก่าของบอท
                // =====================================================
                try {

                    const messages =
                        await interaction.channel.messages.fetch({
                            limit: 50
                        });

                    const botMessages =
                        messages.filter(
                            message =>
                                message.author.id ===
                                interaction.client.user.id
                        );

                    for (const [, message] of botMessages) {

                        try {

                            await message.delete();

                        } catch (deleteError) {

                            console.log(
                                '⚠️ ไม่สามารถลบข้อความเก่า:',
                                deleteError.message
                            );
                        }
                    }

                } catch (error) {

                    console.error(
                        '❌ Error deleting old setup messages:',
                        error
                    );
                }


                // =====================================================
                // ส่งข้อความใหม่ + รูป + เมนู
                // =====================================================
                try {

                    await interaction.channel.send({
                        embeds: [embed],
                        files: [attachment],
                        components: [row]
                    });

                } catch (error) {

                    console.error(
                        '❌ Error sending register message:',
                        error
                    );

                    return await interaction.reply({
                        content:
                            '❌ ไม่สามารถส่งรูป register.png ได้\n' +
                            'กรุณาตรวจสอบว่าไฟล์ register.png อยู่ข้าง index.js',
                        ephemeral: true
                    });
                }


                // =====================================================
                // ตอบ /setup
                // =====================================================
                await interaction.reply({
                    content:
                        '✅ อัปเดตห้องลงทะเบียนเรียบร้อยแล้ว',
                    ephemeral: true
                });

                return;
            }


            // =====================================================
            // COMMAND อื่น ๆ
            // =====================================================
            const command =
                interaction.client.commands.get(
                    interaction.commandName
                );

            if (!command) return;

            try {

                await command.execute(interaction);

            } catch (error) {

                console.error(error);

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            '❌ เกิดข้อผิดพลาดในการรันคำสั่ง',
                        ephemeral: true
                    });
                }
            }

            return;
        }


        // =========================================================
        // 2. SELECT MENU
        // =========================================================
        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'select_role_menu') {

                const requiredRoom =
                    '1486030638464237631';

                if (
                    interaction.channelId !==
                    requiredRoom
                ) {
                    return await interaction.reply({
                        content:
                            `❌ กรุณาใช้งานในห้อง <#${requiredRoom}> เท่านั้นครับ!`,
                        ephemeral: true
                    });
                }

                const selectedRoleId =
                    interaction.values[0];

                try {

                    // =================================================
                    // MODAL
                    // =================================================
                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `server_register_modal_${selectedRoleId}`
                            )
                            .setTitle(
                                'ลงทะเบียนรับยศ & ตรวจสอบ VAC'
                            );


                    // ชื่อ Discord
                    const nicknameInput =
                        new TextInputBuilder()
                            .setCustomId(
                                'modal_nickname'
                            )
                            .setLabel(
                                'ชื่อในดิสคอร์ด (ชื่อที่จะให้เปลี่ยนในเซิร์ฟ)'
                            )
                            .setPlaceholder(
                                'กรอกชื่อเล่นหรือชื่อที่ต้องการเปลี่ยน'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true);


                    // Steam ID64
                    const steamInput =
                        new TextInputBuilder()
                            .setCustomId(
                                'modal_steam_id'
                            )
                            .setLabel(
                                'Steam ID64 (17 หลัก)'
                            )
                            .setPlaceholder(
                                '76561198445731318'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true);


                    modal.addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                nicknameInput
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                steamInput
                            )
                    );


                    await interaction.showModal(
                        modal
                    );

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
        // 3. MODAL SUBMIT
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


                // =================================================
                // ดึง Role ID
                // =================================================
                const roleId =
                    interaction.customId.split('_')[3];


                // =================================================
                // รับข้อมูล
                // =================================================
                const newNickname =
                    interaction.fields.getTextInputValue(
                        'modal_nickname'
                    );

                const steamId =
                    interaction.fields
                        .getTextInputValue(
                            'modal_steam_id'
                        )
                        .trim();


                // =================================================
                // ตรวจ Steam ID64
                // =================================================
                const steamIdRegex =
                    /^\d{17}$/;

                if (
                    !steamIdRegex.test(
                        steamId
                    )
                ) {

                    return await interaction.editReply({
                        content:
                            '❌ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลักเท่านั้น'
                    });
                }


                const member =
                    interaction.member;

                const guild =
                    interaction.guild;


                try {

                    // =================================================
                    // ตรวจ VAC
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
                                (await import(
                                    'node-fetch'
                                )).default;


                            const response =
                                await fetch(
                                    `[https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=$](https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=$){apiKey}&steamids=${steamId}`
                                );


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
                    // ค้นหา Role
                    // =================================================
                    const targetRole =
                        guild.roles.cache.get(
                            roleId
                        );


                    if (!targetRole) {

                        return await interaction.editReply({
                            content:
                                '❌ ไม่พบยศนี้ในระบบเซิร์ฟเวอร์ กรุณาติดต่อแอดมิน'
                        });
                    }


                    // =================================================
                    // เปลี่ยนชื่อ
                    // =================================================
                    await member.setNickname(
                        newNickname
                    );


                    // =================================================
                    // เพิ่ม Role
                    // =================================================
                    await member.roles.add(
                        targetRole.id
                    );


                    // =================================================
                    // เวลาไทย
                    // =================================================
                    const now =
                        new Date();


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
                    // LOG 1 (ปรับเป็น Markdown Code Block)
                    // =================================================
                    const logChannel1 =
                        guild.channels.cache.get(
                            '1538429606409928815'
                        );


                    if (logChannel1) {

                        const logMessage1 =
'```md\n' +
`# 🟢 สมาชิกรับยศและตรวจสอบ VAC\n` +
`- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
`- ชื่อหลัก (Username): ${member.user.username}\n` +
`- User ID: ${member.id}\n` +
`- Steam ID64: ${steamId}\n` +
`- Steam Profile: https://steamcommunity.com/profiles/${steamId}\n` +
`- สถานะ VAC: ${vacStatus}\n` +
`- จำนวน VAC Ban: ${vacBansCount}\n` +
`- จำนวน Game Ban: ${gameBansCount}\n` +
`- ยศที่ได้รับ: ${targetRole.name}\n` +
`- Role ID: ${roleId}\n` +
`- เวลา: ${formattedDate}\n` +
'```';


                        await logChannel1.send(
                            logMessage1
                        );
                    }


                    // =================================================
                    // LOG 2 (ปรับเป็น Markdown Code Block)
                    // =================================================
                    const logChannel2 =
                        guild.channels.cache.get(
                            '1494379391327928370'
                        );


                    if (logChannel2) {

                        const logMessage2 =
'```md\n' +
`# 📝 บันทึกข้อมูลการลงทะเบียนรับยศ\n` +
`- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
`- ชื่อหลัก (Username): ${member.user.tag}\n` +
`- User ID: ${member.id}\n` +
`- Steam ID64: ${steamId}\n` +
`- ยศที่ได้รับ: ${targetRole.name}\n` +
`- Role ID: ${roleId}\n` +
`- เวลา: ${formattedDate}\n` +
'```';


                        await logChannel2.send(
                            logMessage2
                        );
                    }


                    // =================================================
                    // SUCCESS
                    // =================================================
                    await interaction.editReply({
                        content:
`✅ **ลงทะเบียนสำเร็จเรียบร้อย!**

- เปลี่ยนชื่อเป็น: **${newNickname}**
- รับยศ: **${targetRole.name}** เรียบร้อยแล้วครับ`
                    });


                } catch (error) {

                    console.error(
                        '❌ Error processing registration modal:',
                        error
                    );


                    await interaction.editReply({
                        content:
                            '❌ เกิดข้อผิดพลาดในการเปลี่ยนชื่อหรือเพิ่มยศ (ตรวจสอบสิทธิ์ Manage Roles / Nicknames และตำแหน่งยศของบอท)'
                    });
                }

                return;
            }
        }
    }
};
