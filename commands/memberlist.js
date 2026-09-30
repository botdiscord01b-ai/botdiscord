const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memberlist')
        .setDescription('📊 [Admin] แสดงรายชื่อสมาชิกที่เชื่อมโยงข้อมูลทั้งหมดในรูปแบบตาราง')
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

        try {
            // ดึงข้อมูลทั้งหมดเรียงตามลำดับเวลาลงทะเบียน (เก่าไปใหม่)
            const membersData = await User.find().sort({ createdAt: 1 });

            if (!membersData || membersData.length === 0) {
                return await interaction.editReply({ content: '❌ ยังไม่มีข้อมูลสมาชิกในระบบฐานข้อมูล' });
            }

            let tableText = '```text\n';
            tableText += 'ที่ | ชื่อดิสคอร์ด          | Discord ID        | Steam ID64        | ตำแหน่งโรล\n';
            tableText += '----|---------------------|-------------------|-------------------|--------------------\n';

            let index = 1;
            for (const data of membersData) {
                const guildMember = await interaction.guild.members.fetch(data.discordId).catch(() => null);
                
                const no = String(index++).padEnd(3, ' ');
                const discordName = guildMember ? guildMember.user.username.padEnd(19, ' ') : 'Unknown User      ';
                const discordId = (data.discordId || '').padEnd(17, ' ');
                const steamId = (data.steamId || 'N/A').padEnd(17, ' ');
                const roleName = guildMember && guildMember.roles.highest ? guildMember.roles.highest.name : 'No Role';

                tableText += `${no} | ${discordName} | ${discordId} | ${steamId} | ${roleName}\n`;
            }

            tableText += '```';

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('📋 รายชื่อสมาชิกที่ลงทะเบียนและเชื่อมโยงข้อมูลทั้งหมด')
                .setDescription(tableText)
                .setFooter({ text: `จำนวนสมาชิกทั้งหมด: ${membersData.length} คน` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error generating member list:', error);
            await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิกจากฐานข้อมูล' });
        }
    },
};
