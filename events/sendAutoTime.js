const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const CHANNEL_ID = '1526811651607629834'; 

        console.log('✅ ระบบแสดง วัน-เวลา ในห้องเสียง (Voice Channel) เริ่มทำงานแล้ว!');

        const updateClockChannels = async () => {
            const ch = client.channels.cache.get(CHANNEL_ID);
            if (!ch) return;

            const now = new Date();
            const day = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', day: '2-digit' });
            const month = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', month: 'short' });
            const dateShort = `${day}-${month}`; 

            const timeString = now.toLocaleTimeString('th-TH', {
                timeZone: 'Asia/Bangkok',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const newRoomName = `📅︱${dateShort}︱${timeString}`;

            if (ch.name !== newRoomName) {
                await ch.setName(newRoomName).catch(err => console.error('❌ ไม่สามารถเปลี่ยนชื่อห้องได้:', err.message));
            }
        };

        const startSyncTimeout = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const nextTargetMinute = Math.ceil((minutes + 0.1) / 10) * 10;
            const minutesToWait = nextTargetMinute - minutes;
            const msToWait = (minutesToWait * 60 * 1000) - (seconds * 1000);

            setTimeout(async () => {
                await updateClockChannels();
                setInterval(async () => {
                    await updateClockChannels();
                }, 600000);
            }, msToWait);
        };

        await updateClockChannels();
        startSyncTimeout();
    },
};
