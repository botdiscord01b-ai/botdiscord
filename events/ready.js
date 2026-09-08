const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ บอทชื่อ ${client.user.tag} ออนไลน์แล้ว!`);
    },
};
