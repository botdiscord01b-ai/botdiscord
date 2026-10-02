const { Events } = require('discord.js');
const MemberActivity = require('../models/MemberActivity');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        // ถ้าผู้ใช้อยู่ในห้องเสียง (Join หรือ Move ห้อง)
        if (newState.channelId) {
            await MemberActivity.findOneAndUpdate(
                { guildId: newState.guild.id, userId: member.id },
                { lastActive: new Date() },
                { upsert: true, new: true }
            ).catch(err => console.error('❌ Error updating voice activity:', err));
        }
    },
};
