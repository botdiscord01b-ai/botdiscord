const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const WELCOME_CHANNEL_ID = '1205000338382524416'; 

        try {
            const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
            if (!channel) return;

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setTitle('🎉 ยินดีต้อนรับสมาชิกใหม่เข้าสู่เซิร์ฟเวอร์!')
                .setDescription(`สวัสดีคุณ ${member} ขอให้สนุกกับการเล่นเกมและพูดคุยใน **${member.guild.name}** นะครับ!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '📋 คำแนะนำเบื้องต้น', value: 'อย่าลืมไปกดยืนยันตัวตน/รับยศที่ห้องรับยศ และอ่านกฎของเซิร์ฟเวอร์ด้วยนะครับ' },
                    { name: '👥 สมาชิกคนที่', value: `${member.guild.memberCount}`, inline: true }
                )
                .setFooter({ text: 'ระบบต้อนรับอัตโนมัติ', iconURL: member.guild.iconURL() })
                .setTimestamp();

            await channel.send({ 
                content: `👋 ยินดีต้อนรับ ${member} เข้าสู่เซิร์ฟเวอร์ครับ!`, 
                embeds: [welcomeEmbed] 
            });

            console.log(`[WELCOME] ส่งข้อความต้อนรับให้ ${member.user.tag} สำเร็จ`);
        } catch (error) {
            console.error('[WELCOME] เกิดข้อผิดพลาดในการส่งข้อความต้อนรับ:', error);
        }
    }
};
