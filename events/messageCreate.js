const MemberActivity = require('../models/MemberActivity');

// ใน Event messageCreate
if (message.author.bot || !message.guild) return;

await MemberActivity.findOneAndUpdate(
    { guildId: message.guild.id, userId: message.author.id },
    { lastActive: new Date() },
    { upsert: true, new: true }
).catch(err => console.error('❌ Error updating message activity:', err));
