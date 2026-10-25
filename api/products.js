import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // ดึงข้อมูลสินค้าทั้งหมด (GET)
    if (req.method === 'GET') {
        try {
            let products = await kv.get('yulgang_drop_products');
            // ถ้าในฐานข้อมูลยังไม่มี ให้ใส่รายการเริ่มต้นเข้าไป
            if (!products) {
                products = [
                    { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", price: 35, icon: "💎" },
                    { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", price: 80, icon: "📜" },
                    { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", price: 20, icon: "📦" }
                ];
                await kv.set('yulgang_drop_products', products);
            }
            return res.status(200).json(products);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // อัปเดต/บันทึกรายการสินค้า (POST - สำหรับแอดมิน)
    if (req.method === 'POST') {
        try {
            const { products } = req.body;
            await kv.set('yulgang_drop_products', products);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
