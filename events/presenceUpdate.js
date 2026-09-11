// โค้ดทั้งหมดสำหรับใส่ในไฟล์ events/presenceUpdate.js
const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        // 🆔 ระบุ ID ของห้อง Log ที่ต้องการให้ส่งข้อความไป
        const LOG_CHANNEL_ID = '1547938786632011786';

        // ป้องกัน Error หากไม่มีข้อมูล หรือเป็น บอท
        if (!newPresence || !newPresence.member || newPresence.user.bot) return;

        // ดึง Channel Log จาก Discord Server
        const logChannel = newPresence.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        // กรองเฉพาะกิจกรรมประเภทเล่นเกม (Type 0 = Playing)
        const oldGame = oldPresence?.activities.find(a => a.type === 0);
        const newGame = newPresence.activities.find(a => a.type === 0);

        const user = newPresence.user;

        // 🟢 1. LOG: เริ่มเข้าเล่นเกม
        if (!oldGame && newGame) {
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTitle('🎮 เริ่มเข้าเล่นเกม')
                .setDescription(`**${user.username}** ได้เปิดเกม **${newGame.name}**`)
                .setFooter({ text: `User ID: ${user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }

        // 🔴 2. LOG: เลิกเล่นเกม
        if (oldGame && !newGame) {
            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTitle('⏹️ เลิกเล่นเกม')
                .setDescription(`**${user.username}** ได้ปิดเกม **${oldGame.name}** แล้ว`)
                .setFooter({ text: `User ID: ${user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }

        // 🔵 3. LOG: สลับเปลี่ยนไปเล่นเกมอื่น
        if (oldGame && newGame && oldGame.name !== newGame.name) {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
                .setTitle('🔄 เปลี่ยนเกมที่เล่น')
                .addFields(
                    { name: 'เกมก่อนหน้า', value: oldGame.name, inline: true },
                    { name: 'เกมปัจจุบัน', value: newGame.name, inline: true }
                )
                .setFooter({ text: `User ID: ${user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
    },
};
