const MemberActivity = require('../models/MemberActivity');

// ใน Event voiceStateUpdate (เมื่อผู้ใช้อยู่ในห้องเสียง)
if (newState.member && !newState.member.user.bot) {
    await MemberActivity.findOneAndUpdate(
        { guildId: newState.guild.id, userId: newState.member.id },
        { lastActive: new Date() },
        { upsert: true, new: true }
    ).catch(err => console.error('❌ Error updating voice activity:', err));
}
