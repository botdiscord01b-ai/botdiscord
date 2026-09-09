// =========================================================
// SELECT MENU
// =========================================================
const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_role_menu')
    .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
    .addOptions(options);

const row = new ActionRowBuilder()
    .addComponents(selectMenu);


// =========================================================
// โหลดรูป register.png
// =========================================================
const imagePath = path.join(__dirname, '../register.png');

const attachment = new AttachmentBuilder(imagePath, {
    name: 'register.png'
});


// =========================================================
// EMBED
// =========================================================
const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์')
    .setDescription(
        'กรุณาเลือกยศที่ต้องการรับจากเมนูด้านล่าง\n\n' +
        '🎮 เลือกยศที่ต้องการ\n' +
        '📝 กรอกชื่อที่ต้องการใช้ในเซิร์ฟเวอร์\n' +
        '🔎 กรอก Steam ID64 เพื่อทำการตรวจสอบ VAC\n\n' +
        '⚠️ กรุณากรอกข้อมูลให้ถูกต้อง'
    )
    .setImage('attachment://register.png')
    .setFooter({
        text: 'ระบบลงทะเบียนอัตโนมัติ'
    });


// =========================================================
// ลบข้อความเก่าของบอทในห้องนี้
// =========================================================
try {
    const messages = await interaction.channel.messages.fetch({
        limit: 50
    });

    const botMessages = messages.filter(
        msg => msg.author.id === interaction.client.user.id
    );

    for (const [, message] of botMessages) {
        try {
            await message.delete();
        } catch (err) {
            console.log('ไม่สามารถลบข้อความเก่า:', err.message);
        }
    }

} catch (error) {
    console.error('❌ Error deleting old setup messages:', error);
}


// =========================================================
// ส่งข้อความใหม่ พร้อมรูป register.png
// =========================================================
await interaction.channel.send({
    embeds: [embed],
    files: [attachment],
    components: [row]
});


// ตอบคำสั่ง /setup แบบล่องหน
await interaction.reply({
    content: '✅ อัปเดตระบบลงทะเบียนเรียบร้อยแล้ว',
    ephemeral: true
});

return;
