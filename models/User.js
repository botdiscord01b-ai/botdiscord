const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    steamId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now } // ใช้จับเวลาเพื่อรันเลขลำดับการลงทะเบียน
});

module.exports = mongoose.model('User', userSchema);
