const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ตัวอย่างฟังก์ชันหรือ Event ที่มีการสร้างปุ่มลิงก์ที่ถูกต้อง 100%
function createButtonExample(url, labelText = 'ดูรายละเอียด') {
    // 1. สร้างปุ่มลิงก์ (บังคับใช้ Style Link และคำสั่ง .setUrl ตัวแอลพิมพ์เล็ก)
    const linkButton = new ButtonBuilder()
        .setLabel(labelText)
        .setStyle(ButtonStyle.Link)
        .setUrl(url);

    // 2. นำปุ่มใส่ลงใน ActionRow
    const actionRow = new ActionRowBuilder()
        .addComponents(linkButton);

    return actionRow;
}

// ตัวอย่างการสร้าง Embed ที่ปลอดภัยและไม่มีค่า null ผิดพลาด
function createEmbedExample(title, description, imageUrl) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(title || 'แจ้งเตือนจากระบบ')
        .setDescription(description || 'ไม่มีรายละเอียดเพิ่มเติม')
        .setTimestamp();

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    return embed;
}

module.exports = {
    createButtonExample,
    createEmbedExample
};
