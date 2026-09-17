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

// 📌 อัปเดตไอดีห้องผลหวยใหม่เรียบร้อยครับ
const LOTTO_CHANNEL_ID = '1549991650862964857'; 
const API_URL = 'https://lotto.api.rayriffy.com/latest';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบแจ้งผลและตรวจสลากกินแบ่งพร้อมทำงาน!');

        // เช็กผลหวยอัตโนมัติทุกๆ 1 ชั่วโมง
        setInterval(async () => {
            await updateLottoPost(client);
        }, 60 * 60 * 1000);

        // อัปเดตครั้งแรกทันทีที่เปิดบอท
        await updateLottoPost(client);

        // 🔘 ตรวจจับการกดปุ่ม และการส่งเลขจาก Modal
        client.on(Events.InteractionCreate, async (interaction) => {
            
            // 1. เมื่อผู้ใช้กดปุ่ม "ตรวจสลากกินแบ่ง"
            if (interaction.isButton() && interaction.customId === 'btn_check_lotto') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_lotto_input')
                    .setTitle('🎰 ตรวจสลากกินแบ่งรัฐบาล');

                const numberInput = new TextInputBuilder()
                    .setCustomId('lotto_number')
                    .setLabel('กรอกเลขสลากกินแบ่งของคุณ (6 หลัก)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('เช่น 123456')
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(numberInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);
            }

            // 2. เมื่อผู้ใช้พิมพ์เลขแล้วกด Submit
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
                    const prizes = result.prizes;
                    const runningNumbers = result.runningNumbers;

                    let wonPrizes = [];

                    // ตรวจรางวัลที่ 1 ถึง รางวัลที่ 5
                    prizes.forEach(p => {
                        if (p.number.includes(userNum)) {
                            wonPrizes.push(`${p.name} (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                        }
                    });

                    // ตรวจเลขหน้า 3 ตัว / เลขท้าย 3 ตัว / เลขท้าย 2 ตัว
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

                    await interaction.editReply({ embeds: [resultEmbed] });

                } catch (error) {
                    console.error('❌ [Lotto Check Error]:', error);
                    await interaction.editReply({ content: '❌ เกิดข้อผิดพลาดในการตรวจสอบเลขสลาก' });
                }
            }
        });
    }
};

// 📢 ฟังก์ชันโพสต์/อัปเดตผลหวยลงห้อง
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const res = await fetch(API_URL);
        const data = await res.json();

        if (data.status !== 'success') return;

        const result = data.response;
        const prize1 = result.prizes.find(p => p.id === 'prizeFirst')?.number[0] || '------';
        const front3 = result.runningNumbers.find(p => p.id === 'runningNumberFrontThree')?.number.join('  ') || '--- ---';
        const rear3 = result.runningNumbers.find(p => p.id === 'runningNumberRearThree')?.number.join('  ') || '--- ---';
        const rear2 = result.runningNumbers.find(p => p.id === 'runningNumberRearTwo')?.number[0] || '--';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎰 ผลสลากกินแบ่งรัฐบาล ประจำงวดวันที่ ${result.date}`)
            .setDescription('กดปุ่มด้านล่างเพื่อพิมพ์กรอกเลขสลากของคุณเพื่อตรวจรางวัลได้ทันที!')
            .addFields(
                { name: '🥇 รางวัลที่ 1', value: `\`\`\`text\n${prize1}\n\`\`\``, inline: false },
                { name: '🔹 เลขหน้า 3 ตัว', value: `\`\`\`text\n${front3}\n\`\`\``, inline: true },
                { name: '🔹 เลขท้าย 3 ตัว', value: `\`\`\`text\n${rear3}\n\`\`\``, inline: true },
                { name: '🔴 เลขท้าย 2 ตัว', value: `\`\`\`text\n${rear2}\n\`\`\``, inline: true }
            )
            .setFooter({ text: 'ข้อมูลอัปเดตตรงจากสลากกินแบ่งรัฐบาล', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_check_lotto')
                .setLabel('🔍 คลิกที่นี่เพื่อกรอกเลขตรวจหวย')
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
