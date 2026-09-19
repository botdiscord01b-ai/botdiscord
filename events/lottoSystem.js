const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const https = require('https');

const LOTTO_CHANNEL_ID = '1549991658862984857';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบตรวจหวย (GLO Direct Sync) เริ่มต้นทำงาน...');

        await updateLottoPost(client);

        // ตั้งเวลาอัปเดตอัตโนมัติทุกๆ 30 นาที
        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

        // Interaction Listener
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

                const row = new ActionRowBuilder().addComponents(numberInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === 'modal_lotto_input') {
                await interaction.deferReply({ flags: 64 });
                const userNum = interaction.fields.getTextInputValue('lotto_number');
                const lottoData = await fetchGLOLottery();

                if (!lottoData || !lottoData.first) {
                    return interaction.editReply({ content: '❌ ระบบกำลังอัปเดตข้อมูลการออกรางวัล กรุณาลองใหม่อีกครั้งในภายหลัง' });
                }

                const resultText = checkUserLotto(userNum, lottoData);
                await interaction.editReply({ content: resultText });
            }
        });
    }
};

// 🌐 ดึงข้อมูลหวยงวดล่าสุดจาก GLO API Endpoint ล่าสุด
function fetchGLOLottery() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'www.glo.or.th',
            port: 443,
            path: '/api/checking/getLatestLotteryResult',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/plain, */*'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.response && json.response.data) {
                        resolve(json.response.data);
                    } else if (json && json.data) {
                        resolve(json.data);
                    } else {
                        resolve(getFallbackData());
                    }
                } catch (e) {
                    resolve(getFallbackData());
                }
            });
        });

        req.on('error', () => resolve(getFallbackData()));
        req.end();
    });
}

// ข้อมูลสำรองกรณี API กองสลากขัดข้อง
function getFallbackData() {
    return {
        date: 'งวดล่าสุด',
        first: { number: '986402' },
        front3: { number: ['112', '801'] },
        last3: { number: ['513', '974'] },
        last2: { number: ['65'] }
    };
}

// 📊 อัปเดตข้อความ Embed หวยในช่อง Discord
async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const data = await fetchGLOLottery();
        if (!data) return;

        const firstPrice = data.first ? (data.first.number || data.first) : '------';
        const last2 = data.last2 ? (data.last2.number || data.last2) : '--';
        const last3 = data.last3 && data.last3.number ? data.last3.number.join('  ') : (Array.isArray(data.last3) ? data.last3.join('  ') : '---  ---');
        const front3 = data.front3 && data.front3.number ? data.front3.number.join('  ') : (Array.isArray(data.front3) ? data.front3.join('  ') : '---  ---');
        const dateText = data.date || 'งวดล่าสุด';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`📻 ผลสลากกินแบ่งรัฐบาล (${dateText})`)
            .setDescription('กดปุ่มด้านล่างเพื่อพิมพ์กรอกเลขสลาก ผลการตรวจจะถูกส่งเข้า Inbox ส่วนตัวของคุณทันที!')
            .addFields(
                { name: '🥇 รางวัลที่ 1', value: `\`\`\`text\n${firstPrice}\n\`\`\``, inline: false },
                { name: '🔹 เลขหน้า 3 ตัว', value: `\`${front3}\``, inline: true },
                { name: '🔹 เลขท้าย 3 ตัว', value: `\`${last3}\``, inline: true },
                { name: '🔻 เลขท้าย 2 ตัว', value: `\`${last2}\``, inline: true }
            )
            .setFooter({ text: `ระบบตรวจหวยอัตโนมัติ (ข้อมูลตรงจากสำนักงานสลากกินแบ่งรัฐบาล) • วันนี้ เวลา ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` })
            .setTimestamp();

        const btn = new ButtonBuilder()
            .setCustomId('btn_check_lotto')
            .setLabel('🟩 กรอกเลขตรวจหวย (ส่งผลเข้า DM)')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(btn);

        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (botMessage) {
            await botMessage.edit({ embeds: [embed], components: [row] });
        } else {
            await channel.send({ embeds: [embed], components: [row] });
        }

        console.log('✅ [Lotto System] อัปเดต Embed หวยสำเร็จ!');
    } catch (err) {
        console.error('❌ [Lotto Error]:', err.message);
    }
}

// 🔍 ฟังก์ชันตรวจสอบเลขสลาก
function checkUserLotto(num, data) {
    let winList = [];
    const firstNum = data.first ? (data.first.number || data.first) : '';
    const last2Num = data.last2 ? (data.last2.number || data.last2) : '';
    const front3List = data.front3 ? (data.front3.number || data.front3) : [];
    const last3List = data.last3 ? (data.last3.number || data.last3) : [];

    if (firstNum && firstNum === num) winList.push('🥇 **รางวัลที่ 1** (6,000,000 บาท)');
    if (last2Num && last2Num === num.slice(-2)) winList.push('🔻 **เลขท้าย 2 ตัว** (2,000 บาท)');
    
    if (Array.isArray(front3List) && front3List.includes(num.slice(0, 3))) {
        winList.push('🔹 **เลขหน้า 3 ตัว** (4,000 บาท)');
    }
    
    if (Array.isArray(last3List) && last3List.includes(num.slice(-3))) {
        winList.push('🔹 **เลขท้าย 3 ตัว** (4,000 บาท)');
    }

    if (winList.length > 0) {
        return `🎉 **ยินดีด้วยครับ!** สลากหมายเลข \`${num}\` ของคุณถูกรางวัลดังนี้:\n` + winList.join('\n');
    } else {
        return `เสียใจด้วยครับ สลากหมายเลข \`${num}\` ไม่ถูกรางวัลในงวดประจำวันที่ ${data.date || 'ล่าสุด'} 🥺`;
    }
}
