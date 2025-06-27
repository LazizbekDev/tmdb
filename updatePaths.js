import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const removeTeaserPaths = async () => {
  try {
    // MongoDB bilan ulanish
    await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ DB bilan ulanish o‘rnatildi.");

    // MongoDB native collection dan foydalanish
    const moviesCollection = mongoose.connection.db.collection("movies");

    // teaserpath maydoni mavjud hujjatlarni tekshirish
    const movieTeaserCheck = await moviesCollection.countDocuments({ teaserpath: { $exists: true } });
    console.log(`🔍 [Movies] ${movieTeaserCheck} ta hujjatda teaserpath maydoni mavjud`);

    // teaserpath va teaserext maydonlarini o'chirish
    const movieUpdateResult = await moviesCollection.updateMany(
      { teaserpath: { $exists: true } },
      { $unset: { teaserpath: "", teaserext: "" } }
    );
    console.log(`🎬 [Movies] ${movieUpdateResult.matchedCount || 0} ta hujjat topildi, ${movieUpdateResult.modifiedCount || 0} ta hujjatdan teaserpath va teaserext o‘chirildi`);

    // Qayta tekshirish
    const movieTeaserRecheck = await moviesCollection.countDocuments({ teaserpath: { $exists: true } });
    if (movieTeaserRecheck > 0) {
      console.log(`⚠️ [Movies] ${movieTeaserRecheck} ta hujjatda teaserpath hali mavjud`);
      // Qolgan hujjatlarning namunalarini log qilish
      const remainingDocs = await moviesCollection.find(
        { teaserpath: { $exists: true } },
        { projection: { _id: 1, teaserpath: 1, teaserext: 1 } }
      ).limit(5).toArray();
      console.log("📋 Qolgan hujjatlar namunalari:", JSON.stringify(remainingDocs, null, 2));
    } else {
      console.log(`✅ [Movies] teaserpath va teaserext maydonlari to‘liq o‘chirilgan`);
    }

    console.log("🎉 Yangilanish jarayoni yakunlandi.");
  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
    console.error("Xato tafsilotlari:", err);
  } finally {
    // Ulanishni yopish
    await mongoose.disconnect();
    console.log("🔌 MongoDB ulanishi yopildi.");
  }
};

// Skriptni ishga tushirish
removeTeaserPaths();