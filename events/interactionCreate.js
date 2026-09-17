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

// ID ยศชั่วคราว และ ระยะเวลา 24 ชั่วโมง (ในหน่วยมิลลิวินาที)
const TEMP_ROLE_ID = '1550062346435567657';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // =========================================================
        // 1. SLASH COMMAND
        // =========================================================
        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'setup') {

                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return await interaction.reply({
                        content: '❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้',
                        ephemeral: true
                    });
                }

                const targetChannelId = '1486030638464237631';

                if (interaction.channelId !== targetChannelId) {
                    return await interaction.reply({
                        content: `❌ คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${targetChannelId}> เท่านั้น`,
                        ephemeral: true
                    });
                }

                const guild = interaction.guild;

                // ID ยศหลัก
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
                            .setDescription(`เลือกรับยศ ${roleName} (พร้อมรับยศชั่วคราว 1 วัน)`)
                            .setValue(roleId)
                            .setEmoji(emojis[i] || '⭐')
                    );
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_role_menu')
                    .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const imagePath = path.join(__dirname, '../register.png');
                const attachment = new AttachmentBuilder(imagePath, { name: 'register.png' });

                // Fetch ยศชั่วคราวมาแสดงชื่อใน Embed
                const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
                const tempRoleName = tempRole ? tempRole.name : 'ยศชั่วคราว';

                // =====================================================
                // EMBED (เพิ่มคำแนะนำเรื่องยศชั่วคราว)
                // =====================================================
                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์')
                    .setDescription(
                        'กรุณาเลือกยศที่ต้องการรับจากเมนูด้านล่างเพื่อลงทะเบียน\n\n' +
                        '🎮 **ขั้นตอนการลงทะเบียน:**\n' +
                        '1️⃣ เลือกยศที่ต้องการจากเมนูด้านล่าง\n' +
                        '2️⃣ กรอกชื่อที่ต้องการใช้ในเซิร์ฟเวอร์\n' +
                        '3️⃣ กรอก Steam ID64 เพื่อทำการตรวจสอบ VAC\n\n' +
                        `⏰ **สิทธิพิเศษเพิ่มเติม:**\n` +
                        `เมื่อลงทะเบียนสำเร็จ คุณจะได้รับยศชั่วคราว **<@&${TEMP_ROLE_ID}>** เพิ่มเติมทันที!\n` +
                        `*(ยศชั่วคราวนี้จะมีอายุการใช้งาน **24 ชั่วโมง (1 วัน)** และจะถูกถอดออกอัตโนมัติเมื่อครบกำหนด)*\n\n` +
                        '⚠️ *กรุณากรอกข้อมูลให้ถูกต้องเพื่อผลประโยชน์ของตัวท่านเอง*'
                    )
                    .setImage('attachment://register.png')
                    .setFooter({ text: 'ระบบลงทะเบียนอัตโนมัติ' })
                    .setTimestamp();

                // ลบข้อความเก่า
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 50 });
                    const botMessages = messages.filter(m => m.author.id === interaction.client.user.id);

                    for (const [, message] of botMessages) {
                        await message.delete().catch(() => null);
                    }
                } catch (error) {
                    console.error('❌ Error deleting old setup messages:', error.message);
                }

                // ส่งข้อความใหม่
                try {
                    await interaction.channel.send({
                        embeds: [embed],
                        files: [attachment],
                        components: [row]
                    });
                } catch (error) {
                    console.error('❌ Error sending register message:', error);
                    return await interaction.reply({
                        content: '❌ ไม่สามารถส่งรูป register.png ได้ กรุณาตรวจสอบตำแหน่งไฟล์',
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: '✅ อัปเดตห้องลงทะเบียนเรียบร้อยแล้ว',
                    ephemeral: true
                });

                return;
            }

            const command = interaction.client.commands?.get(interaction.commandName);
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
        // 2. SELECT MENU
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

        // =========================================================
        // 3. MODAL SUBMIT
        // =========================================================
        if (interaction.isModalSubmit()) {

            if (interaction.customId.startsWith('server_register_modal_')) {

                await interaction.deferReply({ ephemeral: true });

                const roleId = interaction.customId.split('_')[3];
                const newNickname = interaction.fields.getTextInputValue('modal_nickname');
                const steamId = interaction.fields.getTextInputValue('modal_steam_id').trim();

                const steamIdRegex = /^\d{17}$/;

                if (!steamIdRegex.test(steamId)) {
                    return await interaction.editReply({
                        content: '❌ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลักเท่านั้น'
                    });
                }

                const member = interaction.member;
                const guild = interaction.guild;

                try {
                    // ตรวจ VAC
                    const apiKey = process.env.STEAM_API_KEY;
                    let vacStatus = '🟢 ไม่พบ VAC Ban';
                    let vacBansCount = 0;
                    let gameBansCount = 0;

                    if (apiKey) {
                        try {
                            const fetch = (await import('node-fetch')).default;
                            const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`;
                            
                            const response = await fetch(apiUrl);
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

                    // ค้นหา Role หลัก
                    const targetRole = guild.roles.cache.get(roleId);

                    if (!targetRole) {
                        return await interaction.editReply({
                            content: '❌ ไม่พบยศนี้ในระบบเซิร์ฟเวอร์ กรุณาติดต่อแอดมิน'
                        });
                    }

                    // เปลี่ยนชื่อ
                    let nickChanged = true;
                    try {
                        await member.setNickname(newNickname);
                    } catch (e) {
                        nickChanged = false;
                    }

                    // 1. เพิ่มยศหลัก
                    await member.roles.add(targetRole.id);

                    // 2. เพิ่มยศชั่วคราว + ตั้งเวลาถอดใน 24 ชม.
                    const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
                    let tempRoleAdded = false;

                    if (tempRole) {
                        await member.roles.add(tempRole.id);
                        tempRoleAdded = true;

                        // ตั้ง Timer ลบยศชั่วคราว
                        setTimeout(async () => {
                            try {
                                const updatedMember = await guild.members.fetch(member.id).catch(() => null);
                                if (updatedMember && updatedMember.roles.cache.has(TEMP_ROLE_ID)) {
                                    await updatedMember.roles.remove(TEMP_ROLE_ID);
                                    console.log(`⏰ ถอดยศชั่วคราวออกจาก ${updatedMember.user.tag} เรียบร้อยแล้ว (ครบ 24 ชม.)`);
                                }
                            } catch (err) {
                                console.error('❌ เกิดข้อผิดพลาดในการถอดยศชั่วคราว:', err);
                            }
                        }, ONE_DAY_MS);
                    }

                    // เวลาไทย
                    const now = new Date();
                    const formattedDate = now.toLocaleDateString('th-TH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }) + ' ' + now.toLocaleTimeString('th-TH', { hour12: false });

                    // LOG 1
                    const logChannel1 = guild.channels.cache.get('1538429606409928815');
                    if (logChannel1) {
                        const logMessage1 = 
'```md\n' +
`# 🟢 สมาชิกรับยศและตรวจสอบ VAC\n` +
`- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
`- ชื่อหลัก (Username): ${member.user.username}\n` +
`- User ID: ${member.id}\n` +
`- Steam ID64: ${steamId}\n` +
`- Steam Profile: [https://steamcommunity.com/profiles/$](https://steamcommunity.com/profiles/$){steamId}\n` +
`- สถานะ VAC: ${vacStatus}\n` +
`- จำนวน VAC Ban: ${vacBansCount}\n` +
`- จำนวน Game Ban: ${gameBansCount}\n` +
`- ยศหลักที่ได้รับ: ${targetRole.name}\n` +
`- ยศชั่วคราว (1 วัน): ${tempRole ? tempRole.name : 'ไม่พบยศ'}\n` +
`- เวลา: ${formattedDate}\n` +
'```';
                        await logChannel1.send(logMessage1);
                    }

                    // LOG 2
                    const logChannel2 = guild.channels.cache.get('1494379391327928370');
                    if (logChannel2) {
                        const logMessage2 = 
'```md\n' +
`# 📝 บันทึกข้อมูลการลงทะเบียนรับยศ\n` +
`- ชื่อเล่นในเซิร์ฟเวอร์: ${newNickname}\n` +
`- ชื่อหลัก (Username): ${member.user.tag}\n` +
`- User ID: ${member.id}\n` +
`- Steam ID64: ${steamId}\n` +
`- ยศหลักที่ได้รับ: ${targetRole.name}\n` +
`- ยศชั่วคราว (1 วัน): ${tempRole ? tempRole.name : 'ไม่พบยศ'}\n` +
`- เวลา: ${formattedDate}\n` +
'```';
                        await logChannel2.send(logMessage2);
                    }

                    // SUCCESS REPLY
                    let replyText = `✅ **ลงทะเบียนสำเร็จเรียบร้อย!**\n\n`;
                    replyText += nickChanged 
                        ? `- เปลี่ยนชื่อเป็น: **${newNickname}**\n` 
                        : `- เปลี่ยนชื่อ: *(ไม่สามารถเปลี่ยนได้เนื่องจากสิทธิ์ของคุณสูงกว่าบอท)*\n`;
                    replyText += `- ได้รับยศหลัก: **${targetRole.name}**\n`;
                    if (tempRoleAdded) {
                        replyText += `- ได้รับยศชั่วคราว: **${tempRole.name}** *(หมดอายุใน 24 ชั่วโมง)*\n`;
                    }

                    await interaction.editReply({ content: replyText });

                } catch (error) {
                    console.error('❌ Error processing registration modal:', error);
                    await interaction.editReply({
                        content: '❌ เกิดข้อผิดพลาดในการเปลี่ยนชื่อหรือเพิ่มยศ'
                    });
                }

                return;
            }
        }
    }
};
