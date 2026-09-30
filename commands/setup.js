const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('ตั้งค่าและอัปเดตข้อความในห้องลงทะเบียนรับยศ')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // โค้ดสร้าง Embed และเมนูเลือกยศจะถูกประมวลผลโดย events/interactionCreate.js
    },
};
