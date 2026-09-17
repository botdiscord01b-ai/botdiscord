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
const API_URL = 'https://lotto.kapook.com/api/lotto_latest.json';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบตรวจหวย (Kapook API) พร้อมทำงาน!');

        // อัปเดตการ์ดตรวจหวยทันทีที่บอทออนไลน์
        await updateLottoPost(client);

        // เช็กอัปเดตทุกๆ 30 นาที
        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

        // 🔘 ระบบตรวจจับ Interaction (กดปุ่ม / ส่ง Modal)
        client.on(Events.InteractionCreate, async (interaction) => {
            
            // 1. เมื่อผู้ใช้กดปุ่มตรวจหวย -> เด้งหน้าต่าง Modal
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

            // 2. เมื่อผู้ใช้ส่งเลขสลาก -> ตรวจสอบผลแล้วส่งเข้า DM
            if (interaction.isModalSubmit() && interaction.customId === 'modal_lotto_input') {
                await interaction.deferReply({ ephemeral: true });

                const userNum = interaction.fields.getTextInputValue('lotto_number');
                const lottoData = await fetchKapookLotto();

                if (!lottoData) {
                    return interaction.editReply({ content: '❌ ไม่สามารถดึงข้อมูลผลหวยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
                }

                let wonPrizes = [];

                // ตรวจรางวัลที่ 1
                if (lottoData.prize1.includes(userNum)) {
                    wonPrizes.push('รางวัลที่ 1 (เงินรางวัล 6,000,000 บาท)');
                }

                // ตรวจเลขหน้า 3 ตัว
                lottoData.front3.forEach(num => {
                    if (userNum.startsWith(num)) {
                        wonPrizes.push(`เลขหน้า 3 ตัว [เลข ${num}] (เงินรางวัล 4,000 บาท)`);
                    }
                });

                // ตรวจเลขท้าย 3 ตัว
                lottoData.rear3.forEach(num => {
                    if (userNum.endsWith(num)) {
                        wonPrizes.push(`เลขท้าย 3 ตัว [เลข ${num}] (เงินรางวัล 4,000 บาท)`);
                    }
                });

                // ตรวจเลขท้าย 2 ตัว
                if (userNum.endsWith(lottoData.rear2)) {
                    wonPrizes.push(`เลขท้าย 2 ตัว [เลข ${lottoData.rear2}] (เงินรางวัล 2,000 บาท)`);
                }

                // สร้าง Embed สรุปผล
                const resultEmbed = new EmbedBuilder().setTimestamp();

                if (wonPrizes.length > 0) {
                    resultEmbed
                        .setColor('#00FF00')
                        .setTitle(`🎉 ยินดีด้วยครับ! คุณถูกรางวัล 🎉`)
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n` + wonPrizes.map(w => `✅ **${w}**`).join('\n'))
                        .setFooter({ text: 'ขอให้โชคดีในงวดถัดๆ ไปครับ!' });
                } else {
                    resultEmbed
                        .setColor('#FF0000')
                        .setTitle(`เสียใจด้วยครับ คุณไม่ถูกรางวัล 😭`)
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n*ไม่พบรางวัลในงวดนี้ อย่าพึ่งท้อ งวดหน้าเอาใหม่ครับ!*`);
                }

                // ส่งผลตรวจเข้า Inbox (DM)
                try {
                    await interaction.user.send({ embeds: [resultEmbed] });
                    await interaction.editReply({ content: '📩 บอทได้ส่งผลการตรวจสลากไปทาง **ข้อความส่วนตัว (DM)** เรียบร้อยแล้วครับ!' });
                } catch (dmErr) {
                    await interaction.editReply({ 
                        content: '⚠️ คุณปิดรับ DM ข้อความส่วนตัว บอทจึงแสดงผลตรวจให้ตรงนี้แทนครับ:', 
                        embeds: [resultEmbed] 
                    });
                }
            }
        });
    }
};

// 📡 ฟังก์ชันดึงข้อมูลผลหวยจาก Kapook API
async function fetchKapookLotto() {
    try {
        const res = await fetch(API_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!res.ok) return null;

        const data = await res.json();
        
        return {
            date: data.date || 'งวดล่าสุด',
            prize1: data.prize1 || ['------'],
            front3: data.runningNumberFrontThree || ['---', '---'],
            rear3: data.runningNumberRearThree || ['---', '---'],
            rear2: data.runningNumberRearTwo?.[0] || '--'
        };
    } catch (err) {
        console.error('❌ [Kapook Fetch Error]:', err.message);
        return null;
    }
}

// 📢 ฟังก์ชันส่ง/แก้ไข การ์ดแจ้งผลหวยในห้อง
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const lotto = await fetchKapookLotto();

        const dateStr = lotto ? lotto.date : 'ล่าสุด';
        const prize1 = lotto ? lotto.prize1.join(' , ') : '------';
        const front3 = lotto ? lotto.front3.join('  ') : '--- ---';
        const rear3 = lotto ? lotto.rear3.join('  ') : '--- ---';
        const rear2 = lotto ? lotto.rear2 : '--';

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
