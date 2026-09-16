module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        const CHANNEL_ID = '1526811651607629834'; 

        console.log('✅ ระบบแสดง วัน-เวลา ในห้องเสียง (Voice Channel) เริ่มทำงานแล้ว!');

        // ฟังก์ชันอัปเดตชื่อห้อง
        const updateClockChannels = async () => {
            try {
                const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                if (!ch) {
                    console.error(`❌ [Clock] ไม่พบห้องเสียง ID: ${CHANNEL_ID}`);
                    return;
                }

                const now = new Date();

                // 1. ดึง วัน และ เดือน (เช่น 15-Jul)
                const day = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', day: '2-digit' });
                const month = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', month: 'short' });
                const dateShort = `${day}-${month}`; 

                // 2. ฟอร์แมต เวลา (ชั่วโมง:นาที)
                const timeString = now.toLocaleTimeString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                // รูปแบบที่แสดงบนห้องเสียง: 📅︱15-Jul︱11:45
                const newRoomName = `📅︱${dateShort}︱${timeString}`;

                // เปลี่ยนชื่อเฉพาะเมื่อชื่อไม่ตรงกับอันเดิม
                if (ch.name !== newRoomName) {
                    await ch.setName(newRoomName);
                    console.log(`⏰ อัปเดตชื่อห้องเสียงเป็น: ${newRoomName}`);
                }
            } catch (err) {
                console.error('❌ [Clock Error] ไม่สามารถเปลี่ยนชื่อห้องได้:', err.message);
            }
        };

        // คำนวณเวลารอให้ลงล็อกนาทีที่ลงท้ายด้วยเลข 0 เป๊ะๆ (เช่น .00, .10, .20)
        const startSyncTimeout = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            const nextTargetMinute = Math.ceil((minutes + 0.1) / 10) * 10;
            const minutesToWait = nextTargetMinute - minutes;
            const msToWait = (minutesToWait * 60 * 1000) - (seconds * 1000);

            console.log(`⏳ [Clock] กำลังรออีก ${(msToWait / 1000 / 60).toFixed(2)} นาที เพื่อให้ลงล็อก 10 นาทีถัดไป...`);

            setTimeout(async () => {
                await updateClockChannels();

                // ทำซ้ำทุกๆ 10 นาที (600,000 มิลลิวินาที)
                setInterval(async () => {
                    await updateClockChannels();
                }, 600000);

            }, msToWait);
        };

        // สั่งทำงานทันทีตอนเปิดบอท 1 ครั้ง และเริ่มระบบซิงค์เวลา
        await updateClockChannels();
        startSyncTimeout();
    }
};
