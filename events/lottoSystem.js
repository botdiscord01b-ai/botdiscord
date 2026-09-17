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
const https = require('https');

const LOTTO_CHANNEL_ID = '1549991650862964857'; 

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] เริ่มต้นทำงานระบบสลากกินแบ่ง...');

        await updateLottoPost(client);

        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

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
                const lottoData = await fetchLottoDataIPv4();

                if (!lottoData) {
                    return interaction.editReply({ content: '❌ ไม่สามารถเชื่อมต่อฐานข้อมูลตรวจหวยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
                }

                let wonPrizes = [];

                lottoData.prizes.forEach(p => {
                    if (p.number && p.number.includes(userNum)) {
                        wonPrizes.push(`${p.name} (เงินรางวัล ${Number(p.reward).toLocaleString()} บาท)`);
                    }
                });

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

// 📡 Helper ดึง HTTP/HTTPS โดยบังคับใช้ IPv4 และ Timeout 5 วินาที
function getHttpsJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            family: 4, // 🔒 บังคับใช้ IPv4 แก้ปัญหา IPv6 Timeout ใน Docker/VPS
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', err => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request Timeout'));
        });
    });
}

// 📡 ฟังก์ชันดึงข้อมูล API พร้อมระบบ Fallback
async function fetchLottoDataIPv4() {
    const urls = [
        'https://lotto.api.rayriffy.com/latest',
        'https://raw.githubusercontent.com/rayriffy/lotto-api/master/latest.json'
    ];

    for (const url of urls) {
        try {
            const data = await getHttpsJson(url);
            const result = data.response || data;

            if (result && result.prizes) {
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
        } catch (err) {
            console.error(`⚠️ [IPv4 Fetch Failed]: ${url} -> ${err.message}`);
        }
    }

    return null;
}

async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const lotto = await fetchLottoDataIPv4();

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
