import 'dotenv/config';
import mongoose from 'mongoose';
import { Telegraf } from 'telegraf';
import Movie from './model/MovieModel.js';
import Series from './model/SeriesModel.js';

const oldBot = new Telegraf(process.env.BOT_TOKEN);
const newBot = new Telegraf(process.env.NEW_BOT_TOKEN);
const channelId = process.env.NEW_CHANNEL_ID;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeRequest(fn) {
    try {
        return await fn();
    } catch (error) {
        if (error.response && error.response.error_code === 429) {
            const retryAfter = (error.response.parameters.retry_after || 30) + 2;
            console.log(`⚠️ Flood limit! ${retryAfter} soniya kutamiz...`);
            await sleep(retryAfter * 1000);
            return await safeRequest(fn);
        }
        throw error;
    }
}

function getFileId(msg) {
    if (!msg) {return null;}
    if (msg.video) {return msg.video.file_id;}
    if (msg.document) {return msg.document.file_id;}
    if (msg.animation) {return msg.animation.file_id;}
    return null;
}

async function migrate() {
    try {
        console.log("🔗 Connecting to Database...");
        await mongoose.connect(process.env.DB);
        console.log("✅ Database Connected!");

        // 1. FILMLAR
        const movies = await Movie.find({});
        console.log(`🎬 Total Movies: ${movies.length}`);

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            try {
                console.log(`[${i + 1}/${movies.length}] Processing: ${movie.name}...`);

                // 1. Eski bot yuboradi
                const msg = await safeRequest(() => oldBot.telegram.sendVideo(channelId, movie.movieUrl, {
                    caption: `🎬 ${movie.name}`
                }));

                // 2. Yangi bot forward qiladi (butun obyektni olish uchun)
                const forwardMsg = await safeRequest(() => newBot.telegram.forwardMessage(channelId, channelId, msg.message_id));
                const newFileId = getFileId(forwardMsg);

                if (!newFileId) {throw new Error("Yangi File ID ni olib bo'lmadi!");}

                // Teaser
                let newTeaserId = movie.teaser;
                if (movie.teaser && movie.teaser.length > 20) {
                    try {
                        const tMsg = await safeRequest(() => oldBot.telegram.sendVideo(channelId, movie.teaser));
                        const fTMsg = await safeRequest(() => newBot.telegram.forwardMessage(channelId, channelId, tMsg.message_id));
                        newTeaserId = getFileId(fTMsg);
                        await oldBot.telegram.deleteMessage(channelId, tMsg.message_id).catch(() => {});
                        await newBot.telegram.deleteMessage(channelId, fTMsg.message_id).catch(() => {});
                    } catch (tErr) {
                        console.error(`      - Teaser error:`, tErr.message);
                    }
                }

                await Movie.findByIdAndUpdate(movie._id, { movieUrl: newFileId, teaser: newTeaserId });
                
                await oldBot.telegram.deleteMessage(channelId, msg.message_id).catch(() => {});

                console.log(`   ✅ Done.`);
                await sleep(2000); 
            } catch (err) {
                console.error(`   ❌ Error on ${movie.name}:`, err.message);
            }
        }

        // 2. SERIALLAR
        const seriesList = await Series.find({});
        console.log(`\n📺 Total Series: ${seriesList.length}`);

        for (const series of seriesList) {
            console.log(`Processing Series: ${series.name}...`);
            let changed = false;

            if (series.teaser && series.teaser.length > 20) {
                try {
                    const tMsg = await safeRequest(() => oldBot.telegram.sendVideo(channelId, series.teaser));
                    const fTMsg = await safeRequest(() => newBot.telegram.forwardMessage(channelId, channelId, tMsg.message_id));
                    const newTId = getFileId(fTMsg);
                    if (newTId) {
                        series.teaser = newTId;
                        changed = true;
                    }
                    await oldBot.telegram.deleteMessage(channelId, tMsg.message_id).catch(() => {});
                    await newBot.telegram.deleteMessage(channelId, fTMsg.message_id).catch(() => {});
                } catch (tErr) {
                    console.error(`   - Teaser error:`, tErr.message);
                }
            }

            for (const season of series.series) {
                for (const episode of season.episodes) {
                    try {
                        const eMsg = await safeRequest(() => oldBot.telegram.sendVideo(channelId, episode.fileId));
                        const fEMsg = await safeRequest(() => newBot.telegram.forwardMessage(channelId, channelId, eMsg.message_id));
                        const eFileId = getFileId(fEMsg);
                        if (eFileId) {
                            episode.fileId = eFileId;
                            changed = true;
                        }
                        await oldBot.telegram.deleteMessage(channelId, eMsg.message_id).catch(() => {});
                        await newBot.telegram.deleteMessage(channelId, fEMsg.message_id).catch(() => {});
                        await sleep(2000);
                    } catch (eErr) {
                        console.error(`   - Episode error:`, eErr.message);
                    }
                }
            }
            if (changed) {
                series.markModified('series');
                await series.save();
            }
            console.log(`   ✅ ${series.name} Done.`);
        }

        console.log("\n✨ MIGRATION COMPLETED!");
        process.exit(0);
    } catch (error) {
        console.error("💥 Critical Failure:", error);
        process.exit(1);
    }
}

migrate();
