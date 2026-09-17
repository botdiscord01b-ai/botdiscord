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
        console.log('🎰 [Lotto System] เริ่มต้นทำงานระบบสลากกินแบ่ง...');

        // โพสต์/อัปเดตทันทีที่เปิดบอท
        await updateLottoPost(client);

        // เช็กผลหวยอัปเดตทุก 1 ชั่วโมง
        setInterval(async () => {
            await updateLottoPost(client);
        }, 60 * 60 * 1000);

        // 🔘 ตรวจจับการกดปุ่ม และ Modal
        client.on(Events.InteractionCreate, async (interaction) => {
            
            // 1. กดปุ่ม -> เปิด Modal
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

            // 2. ส่งเลข -> ตรวจผลแล้วส่งเข้า DM
            if (interaction.isModalSubmit() && interaction.customId === 'modal_lotto_input') {
                await interaction.deferReply({ ephemeral: true });

                const userNum = interaction.fields.getTextInputValue('lotto_number');

                try {
                    const res = await fetch(API_URL);
                    const data = await res.json();

                    if (data.status !== 'success') {
                        return interaction.editReply({ content: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูลผลหวยได้ในขณะนี้' });
                    }

                    const result = data.response;
                    const prizes = result.prizes;
                    const runningNumbers = result.runningNumbers;

                    let wonPrizes = [];

                    prizes.forEach(p => {
                        if (p.number.includes(userNum)) {
                            wonPrizes.push(`${p.name} (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                        }
                    });

                    runningNumbers.forEach(p => {
                        const amount = p.id === 'runningNumberFrontThree' || p.id === 'runningNumberRearThree' ? 3 : 2;
                        const userSub = amount === 2 ? userNum.slice(-2) : (p.id === 'runningNumberFrontThree' ? userNum.slice(0, 3) : userNum.slice(-3));

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
                            .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${result.date}**\n\n*ไม่พบรางวัลในงวดนี้ อย่าพึ่งท้อ งวดหน้าเอาใหม่ครับ!*`);
                    }

                    try {
                        await interaction.user.send({ embeds: [resultEmbed] });
                        await interaction.editReply({ content: '📩 บอทส่งผลตรวจสลากไปทาง **ข้อความส่วนตัว (DM)** เรียบร้อยแล้วครับ!' });
                    } catch (dmErr) {
                        await interaction.editReply({ 
                            content: '⚠️ คุณปิด DM ข้อความส่วนตัว บอทจึงแสดงผลตรวจที่นี่แทนครับ:', 
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

// 📢 ฟังก์ชันสร้าง/อัปเดตการ์ดตรวจหวย
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch((err) => {
            console.error(`❌ [Lotto Error] หาห้อง ID: ${LOTTO_CHANNEL_ID} ไม่เจอ หรือบอทไม่มีสิทธิ์มองเห็นห้อง:`, err.message);
            return null;
        });

        if (!channel) return;

        let dateStr = 'ล่าสุด';
        let prize1 = '------';
        let front3 = '--- ---';
        let rear3 = '--- ---';
        let rear2 = '--';

        // ดึงข้อมูลหวย
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if (data.status === 'success') {
                const result = data.response;
                dateStr = result.date;
                prize1 = result.prizes.find(p => p.id === 'prizeFirst')?.number[0] || '------';
                front3 = result.runningNumbers.find(p => p.id === 'runningNumberFrontThree')?.number.join('  ') || '--- ---';
                rear3 = result.runningNumbers.find(p => p.id === 'runningNumberRearThree')?.number.join('  ') || '--- ---';
                rear2 = result.runningNumbers.find(p => p.id === 'runningNumberRearTwo')?.number[0] || '--';
            }
        } catch (apiErr) {
            console.error('⚠️ [Lotto API Error] ไม่สามารถดึงผลหวยจาก API ได้ กำลังใช้แม่แบบตั้งต้น:', apiErr.message);
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

        // ค้นหาและแก้ไขข้อความเดิม
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessage = messages ? messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('ผลสลากกินแบ่งรัฐบาล')) : null;

        if (botMessage) {
            await botMessage.edit({ embeds: [embed], components: [row] });
            console.log('✅ [Lotto] อัปเดตการ์ดตรวจหวยสำเร็จ!');
        } else {
            await channel.send({ embeds: [embed], components: [row] });
            console.log('✅ [Lotto] ส่งการ์ดตรวจหวยใบใหม่สำเร็จ!');
        }

    } catch (error) {
        console.error('❌ [Lotto Post Error]:', error.message);
    }
}
