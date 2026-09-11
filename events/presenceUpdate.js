const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        // 🆔 ระบุ ID ของห้อง Log ที่ต้องการให้ส่งข้อความไป
        const LOG_CHANNEL_ID = '1547938786632011786';

        if (!newPresence || !newPresence.member || newPresence.user.bot) return;

        const logChannel = newPresence.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        // ดึงเฉพาะกิจกรรมประเภทเล่นเกม (Type 0 = Playing)
        const oldGame = oldPresence?.activities.find(a => a.type === 0);
        const newGame = newPresence.activities.find(a => a.type === 0);

        const member = newPresence.member;
        const user = newPresence.user;

        // ดึงเวลาปัจจุบัน รูปแบบ HH:mm:ss
        const timeString = new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // 🟢 1. กรณี: เข้าเล่นเกม
        if (!oldGame && newGame) {
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL()
                })
                .setDescription(
                    `# 🎮 เข้าเล่นเกม\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **เกม:** ${newGame.name}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // 🔴 2. กรณี: เลิกเล่นเกม
        if (oldGame && !newGame) {
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL()
                })
                .setDescription(
                    `# ⏹️ เลิกเล่นเกม\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **เกม:** ${oldGame.name}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // 🔄 3. กรณี: เปลี่ยนเกมที่เล่น
        if (oldGame && newGame && oldGame.name !== newGame.name) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL()
                })
                .setDescription(
                    `# 🔄 เปลี่ยนเกมที่เล่น\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **จากเกม:** ${oldGame.name}\n` +
                    `- **ไปเกม:** ${newGame.name}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }
    },
};
