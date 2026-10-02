const mongoose = require('mongoose');

const memberActivitySchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true, 
        index: true 
    },
    userId: { 
        type: String, 
        required: true, 
        index: true 
    },
    lastActive: { 
        type: Date, 
        default: Date.now, 
        required: true 
    }
}, {
    timestamps: true // ช่วยเก็บบันทึก createdAt และ updatedAt อัตโนมัติ
});

// สร้าง Compound Index เพื่อให้ค้นหา guildId และ userId ได้อย่างรวดเร็ว
memberActivitySchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MemberActivity', memberActivitySchema);
