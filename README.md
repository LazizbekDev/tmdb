# TMDB Telegram Bot

**TMDB** — bu Telegram uchun mo‘ljallangan film va seriallarni topish, ko‘rish va tavsiya qilish imkonini beruvchi bot. Foydalanuvchilar filmlar va seriallarni izlashlari, ko‘rishlari, o‘z takliflarini yuborishlari va fikr-mulohazalarini qoldirishlari mumkin.

## Xususiyatlari

- **Film va seriallarni izlash:** Foydalanuvchilar nomi yoki kalit so‘zlar orqali film va seriallarni tezda topishlari mumkin.
- **Ko‘rish va yuklab olish:** Har bir film yoki serial uchun to‘g‘ridan-to‘g‘ri Telegram orqali ko‘rish havolasi mavjud.
- **Tavsiya tizimi:** Bot foydalanuvchi tarixiga asoslanib, mos filmlar yoki seriallarni tavsiya qiladi.
- **Fikr va takliflar:** Foydalanuvchilar o‘z taklif va fikrlarini yuborishlari mumkin, adminlar esa ularga javob bera oladi.
- **Admin panel:** Adminlar yangi film/serial qo‘shishi, yangi mavsum yuklashi va foydalanuvchi xabarlariga javob bera oladi.
- **Inline search:** Har qanday chatda bot orqali film yoki serial izlash mumkin.

## Texnologiyalar

- **Node.js** va **Express** — server va API uchun
- **Telegraf** — Telegram bot uchun
- **MongoDB** va **Mongoose** — ma’lumotlar bazasi
- **dotenv** — maxfiy sozlamalar uchun
- **node-cron** — avtomatik tavsiya va health check uchun

## Ishga tushirish

1. **Klonlash:**
   ```sh
   git clone https://github.com/LazizbekDev/TMDB.git
   cd bot
   ```

2. **Kerakli paketlarni o‘rnatish:**
   ```sh
   npm install
   ```

3. **.env faylini to‘ldiring:**
   ```
   BOT_TOKEN=telegram-bot-token
   ADMIN=admin_username
   ADMIN_ID=admin_telegram_id
   CHANNEL_USERNAME=kanal_username
   ID=kanal_id
   DB=mongodb_connection_string
   PORT=5000
   URL=https://your-app-url.com
   ```

4. **Botni ishga tushiring:**
   ```sh
   npm start
   ```

## Foydalanish

- `/start` — Botni boshlash va asosiy menyu
- `/list` — Barcha filmlar va seriallar ro‘yxati
- `/suggest` — Siz uchun tavsiya
- Inline search: `@bot_username film nomi`
- Fikr va takliflar uchun: "Send feedback" tugmasi

## Hissa qo‘shish

Pull requestlar va takliflar uchun xush kelibsiz!

---

**Muallif:** Lazizbek Tojiboyev  
**Litsenziya:** ISC  