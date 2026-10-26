// ใช้หน่วยความจำชั่วคราวบน Serverless เพื่อให้ระบบทำงานได้ทันทีโดยไม่ต้องต่อ KV
let memoryStore = {
    products: [
        { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", amount: 1, price: 35, currency: "บาท", image: "" },
        { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", amount: 1, price: 80, currency: "บาท", image: "" },
        { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", amount: 100, price: 20, currency: "บาท", image: "" }
    ],
    orders: [],
    chats: {},
    logs: [
        { time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเปิดใช้งานโหมด Memory สำเร็จ" }
    ]
};

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        try {
            return res.status(200).json(memoryStore);
        } catch (error) {
            return res.status(200).json(memoryStore);
        }
    }

    if (req.method === 'POST') {
        try {
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            memoryStore = {
                products: bodyData.products || memoryStore.products,
                orders: bodyData.orders || [],
                chats: bodyData.chats || {},
                logs: bodyData.logs || []
            };

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
