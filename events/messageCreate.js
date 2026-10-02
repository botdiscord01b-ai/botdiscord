const { Events } = require('discord.js');
const MemberActivity = require('../models/MemberActivity');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // อัปเดตเวลาใช้งานล่าสุดเมื่อพิมพ์ข้อความ
        await MemberActivity.findOneAndUpdate(
            { guildId: message.guild.id, userId: message.author.id },
            { lastActive: new Date() },
            { upsert: true, new: true }
        ).catch(err => console.error('❌ Error updating message activity:', err));
    },
};
