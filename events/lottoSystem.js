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

// 🌐 API หลัก และ API สำรอง
const PRIMARY_API = 'https://lotto.api.rayriffy.com/latest';
const BACKUP_API = 'https://thai-lottery-api.vercel.app/latest';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบพร้อมทำงาน!');

        // อัปเดตการ์ดตรวจหวยทันที
        await updateLottoPost(client);

        // เช็กผลหวยอัปเดตทุก 30 นาที
        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

        // 🔘 ตรวจจับ Interactions (Button & Modal)
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
                const lottoData = await fetchLottoData();

                if (!lottoData) {
                    return interaction.editReply({ content: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูลตรวจหวยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
                }

                let wonPrizes = [];

                // ตรวจรางวัลหลัก
                lottoData.prizes.forEach(p => {
                    if (p.number && p.number.includes(userNum)) {
                        wonPrizes.push(`${p.name} (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                    }
                });

                // ตรวจเลขหน้า 3 / เลขท้าย 3 / เลขท้าย 2
                lottoData.runningNumbers.forEach(p => {
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
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n` + wonPrizes.map(w => `✅ **${w}**`).join('\n'))
                        .setFooter({ text: 'ขอให้โชคดีในงวดถัดๆ ไปครับ!' });
                } else {
                    resultEmbed
                        .setColor('#FF0000')
                        .setTitle(`เสียใจด้วยครับ คุณไม่ถูกรางวัล 😭`)
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n*ไม่พบรางวัลในงวดนี้ งวดหน้าเอาใหม่ครับ!*`);
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
            }
        });
    }
};

// 📡 ฟังก์ชันดึงข้อมูลจาก API แบบมีระบบสำรอง
async function fetchLottoData() {
    // ลอง API หลักก่อน
    try {
        const res = await fetch(PRIMARY_API);
        const data = await res.json();
        if (data && data.status === 'success' && data.response) {
            return parseData(data.response);
        }
    } catch (err) {
        console.error('⚠️ [Primary Lotto API Failed] กำลังดึงจาก API สำรอง...');
    }

    // ถ้า API หลักล้มเหลว ให้ใช้ API สำรอง
    try {
        const res = await fetch(BACKUP_API);
        const data = await res.json();
        if (data && data.response) {
            return parseData(data.response);
        }
    } catch (backupErr) {
        console.error('❌ [All Lotto APIs Failed]:', backupErr.message);
    }

    return null;
}

// จัดการรูปแบบ Format ข้อมูลให้ตรงกัน
function parseData(result) {
    const p1Obj = result.prizes?.find(p => p.id === 'prizeFirst');
    const f3Obj = result.runningNumbers?.find(p => p.id === 'runningNumberFrontThree');
    const r3Obj = result.runningNumbers?.find(p => p.id === 'runningNumberRearThree');
    const r2Obj = result.runningNumbers?.find(p => p.id === 'runningNumberRearTwo');

    return {
        date: result.date || 'ล่าสุด',
        prize1: p1Obj?.number?.[0] || '------',
        front3: f3Obj?.number?.join('  ') || '--- ---',
        rear3: r3Obj?.number?.join('  ') || '--- ---',
        rear2: r2Obj?.number?.[0] || '--',
        prizes: result.prizes || [],
        runningNumbers: result.runningNumbers || []
    };
}

// 📢 ฟังก์ชันส่ง/แก้ไข การ์ดในห้อง Discord
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const lotto = await fetchLottoData();

        const dateStr = lotto ? lotto.date : 'ล่าสุด';
        const prize1 = lotto ? lotto.prize1 : '------';
        const front3 = lotto ? lotto.front3 : '--- ---';
        const rear3 = lotto ? lotto.rear3 : '--- ---';
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
