const { 
    Events, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');

const LOTTO_CHANNEL_ID = '1549991650862964857'; 
const API_URL = 'https://lotto.api.rayriffy.com/latest';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบพร้อมทำงาน!');

        // อัปเดตทันทีเมื่อบอทออนไลน์
        await updateLottoPost(client);

        // เช็กผลหวยอัปเดตทุก 30 นาที
        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

        // 🔘 ตรวจจับการกดปุ่ม และ Modal
        client.on(Events.InteractionCreate, async (interaction) => {
            
            if (interaction.isButton() && interaction.customId === 'btn_check_lotto') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_lotto_input')
                    .setTitle('🎰 ตรวจสลากกินแบ่งรัฐบาล');

                const numberInput = new TextInputBuilder()
                    .setCustomId('lotto_number')
                    .setLabel('กรอกเลขสลากกินแบ่ง (6 หลัก)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('เช่น 123456')
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(numberInput));
                await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === 'modal_lotto_input') {
                await interaction.deferReply({ ephemeral: true });

                const userNum = interaction.fields.getTextInputValue('lotto_number');

                try {
                    const res = await fetch(API_URL);
                    const data = await res.json();

                    if (data.status !== 'success') {
                        return interaction.editReply({ content: '❌ ไม่สามารถดึงข้อมูลผลหวยได้ในขณะนี้' });
                    }

                    const result = data.response;
                    const prizes = result.prizes || [];
                    const runningNumbers = result.runningNumbers || [];

                    let wonPrizes = [];

                    prizes.forEach(p => {
                        if (p.number && p.number.includes(userNum)) {
                            wonPrizes.push(`${p.name} (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                        }
                    });

                    runningNumbers.forEach(p => {
                        if (!p.number) return;
                        const isTwo = p.id === 'runningNumberRearTwo';
                        const isFrontThree = p.id === 'runningNumberFrontThree';
                        
                        const userSub = isTwo ? userNum.slice(-2) : (isFrontThree ? userNum.slice(0, 3) : userNum.slice(-3));

                        if (p.number.includes(userSub)) {
                            wonPrizes.push(`${p.name} [เลข ${userSub}] (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                        }
                    });

                    const resultEmbed = new EmbedBuilder().setTimestamp();

                    if (wonPrizes.length > 0) {
                        resultEmbed
                            .setColor('#00FF00')
                            .setTitle(`🎉 ยินดีด้วยครับ! คุณถูกรางวัล 🎉`)
                            .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${result.date}**\n\n` + wonPrizes.map(w => `✅ **${w}**`).join('\n'))
                            .setFooter({ text: 'ขอให้โชคดีในงวดถัดๆ ไปครับ!' });
                    } else {
                        resultEmbed
                            .setColor('#FF0000')
                            .setTitle(`เสียใจด้วยครับ คุณไม่ถูกรางวัล 😭`)
                            .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${result.date}**\n\n*ไม่พบรางวัลในงวดนี้ งวดหน้าเอาใหม่ครับ!*`);
                    }

                    try {
                        await interaction.user.send({ embeds: [resultEmbed] });
                        await interaction.editReply({ content: '📩 บอทส่งผลตรวจสลากไปทาง **ข้อความส่วนตัว (DM)** เรียบร้อยแล้วครับ!' });
                    } catch (dmErr) {
                        await interaction.editReply({ 
                            content: '⚠️ คุณปิด DM บอทจึงส่งผลตรวจให้ที่นี่แทนครับ:', 
                            embeds: [resultEmbed] 
                        });
                    }

                } catch (error) {
                    console.error('❌ [Lotto Check Error]:', error);
                    await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการตรวจสอบเลขสลาก' });
                }
            }
        });
    }
};

// 📢 ฟังก์ชันส่ง/แก้ไข โพสต์ผลหวย
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        let dateStr = 'ล่าสุด';
        let prize1 = '------';
        let front3 = '--- ---';
        let rear3 = '--- ---';
        let rear2 = '--';

        try {
            const res = await fetch(API_URL);
            const data = await res.json();

            if (data && data.status === 'success' && data.response) {
                const result = data.response;
                dateStr = result.date || 'ล่าสุด';

                // ดึงรางวัลที่ 1
                const p1Obj = result.prizes?.find(p => p.id === 'prizeFirst');
                if (p1Obj && p1Obj.number && p1Obj.number.length > 0) prize1 = p1Obj.number[0];

                // ดึงเลขหน้า 3 ตัว
                const f3Obj = result.runningNumbers?.find(p => p.id === 'runningNumberFrontThree');
                if (f3Obj && f3Obj.number) front3 = f3Obj.number.join('  ');

                // ดึงเลขท้าย 3 ตัว
                const r3Obj = result.runningNumbers?.find(p => p.id === 'runningNumberRearThree');
                if (r3Obj && r3Obj.number) rear3 = r3Obj.number.join('  ');

                // ดึงเลขท้าย 2 ตัว
                const r2Obj = result.runningNumbers?.find(p => p.id === 'runningNumberRearTwo');
                if (r2Obj && r2Obj.number && r2Obj.number.length > 0) rear2 = r2Obj.number[0];
            }
        } catch (apiErr) {
            console.error('⚠️ [Lotto API Error]:', apiErr.message);
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎰 ผลสลากกินแบ่งรัฐบาล ประจำงวดวันที่ ${dateStr}`)
            .setDescription('กดปุ่มด้านล่างเพื่อพิมพ์กรอกเลขสลาก ผลการตรวจจะถูกส่งเข้า Inbox ส่วนตัวของคุณทันที!')
            .addFields(
                { name: '🥇 รางวัลที่ 1', value: `\`\`\`text\n${prize1}\n\`\`\``, inline: false },
                { name: '🔹 เลขหน้า 3 ตัว', value: `\`\`\`text\n${front3}\n\`\`\``, inline: true },
                { name: '🔹 เลขท้าย 3 ตัว', value: `\`\`\`text\n${rear3}\n\`\`\``, inline: true },
                { name: '🔴 เลขท้าย 2 ตัว', value: `\`\`\`text\n${rear2}\n\`\`\``, inline: true }
            )
            .setFooter({ text: 'ระบบตรวจหวยอัตโนมัติ', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_check_lotto')
                .setLabel('🔍 กรอกเลขตรวจหวย (ส่งผลเข้า DM)')
                .setStyle(ButtonStyle.Success)
        );

        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessage = messages ? messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('ผลสลากกินแบ่งรัฐบาล')) : null;

        if (botMessage) {
            await botMessage.edit({ embeds: [embed], components: [row] });
        } else {
            await channel.send({ embeds: [embed], components: [row] });
        }

    } catch (error) {
        console.error('❌ [Lotto Post Error]:', error.message);
    }
}
