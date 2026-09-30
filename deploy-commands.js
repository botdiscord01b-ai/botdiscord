require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

if (fs.existsSync(foldersPath)) {
    const commandItems = fs.readdirSync(foldersPath);

    for (const item of commandItems) {
        const itemPath = path.join(foldersPath, item);
        
        // เช็กว่าเป็นโฟลเดอร์หรือเป็นไฟล์ .js โดยตรง
        if (fs.lstatSync(itemPath).isDirectory()) {
            const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(itemPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
            }
        } else if (item.endsWith('.js')) {
            const command = require(itemPath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

// ใช้ DISCORD_TOKEN ให้ตรงกับไฟล์ index.js
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 กำลังลงทะเบียนคำสั่งทั้งหมด ${commands.length} คำสั่ง...`);

        // ลงทะเบียนแบบ Global
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ ลงทะเบียนคำสั่ง Slash Commands สำเร็จแล้ว!');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
    }
})();
