const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linksteam')
        .setDescription('👑 [Admin] เชื่อมโยง Discord ID กับ Steam ID64 สำหรับสมาชิกเก่า')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('เลือกสมาชิก Discord ที่ต้องการผูกข้อมูล')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('steamid')
                .setDescription('Steam ID64 (17 หลัก)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetChannelId = '1554545385471741982';
        if (interaction.channelId !== targetChannelId) {
            return await interaction.reply({ 
                content: `❌ คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${targetChannelId}> เท่านั้น`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getUser('user');
        const steamId = interaction.options.getString('steamid').trim();

        if (!/^\d{17}$/.test(steamId)) {
            return await interaction.editReply({ content: '❌ Steam ID64 ไม่ถูกต้อง! กรุณากรอกเป็นตัวเลข 17 หลัก' });
        }

        try {
            await User.findOneAndUpdate(
                { discordId: targetUser.id },
                { 
                    discordId: targetUser.id, 
                    steamId: steamId 
                },
                { upsert: true, new: true }
            );

            await interaction.editReply({ 
                content: `✅ เชื่อมโยงข้อมูลสำเร็จ!\n- สมาชิก: <@${targetUser.id}>\n- Steam ID64: \`${steamId}\`` 
            });

        } catch (error) {
            console.error('❌ Error linking steam ID:', error);
            await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล' });
        }
    },
};
