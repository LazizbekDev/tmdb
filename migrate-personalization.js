import "dotenv/config";
import mongoose from "mongoose";
import User from "./model/User.js";
import MovieModel from "./model/MovieModel.js";
import SeriesModel from "./model/SeriesModel.js";
import { extractGenres } from "./utilities/utilities.js";

const isDryRun = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(Boolean).map((item) => String(item));
};

const inferFavoriteGenres = async (user) => {
  const interestIds = [...new Set([...(user.accessedMovies || []), ...(user.savedMovies || [])])];

  if (!interestIds.length) {
    return [];
  }

  const [movies, series] = await Promise.all([
    MovieModel.find({ _id: { $in: interestIds } }, { keywords: 1 }).lean(),
    SeriesModel.find({ _id: { $in: interestIds } }, { keywords: 1 }).lean(),
  ]);

  const genreCount = {};

  [...movies, ...series].forEach((item) => {
    extractGenres(item.keywords || []).forEach((genre) => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });

  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
};

const migrateUsers = async () => {
  const users = await User.find({});
  let updated = 0;

  for (const user of users) {
    const update = {};

    if (user.favoriteGenres === undefined) {
      update.favoriteGenres = [];
    }

    if (user.notificationsEnabled === undefined) {
      update.notificationsEnabled = true;
    }

    if (user.onboardingCompleted === undefined) {
      update.onboardingCompleted = false;
    }

    if (user.rejectedMovies === undefined) {
      update.rejectedMovies = [];
    }

    if (!Array.isArray(user.favoriteGenres) || user.favoriteGenres.length === 0) {
      const inferredGenres = await inferFavoriteGenres(user);
      if (inferredGenres.length) {
        update.favoriteGenres = inferredGenres;
      }
    }

    if (Object.keys(update).length === 0) {
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would update user ${user.telegramId}`);
    } else {
      await User.updateOne({ _id: user._id }, { $set: update });
    }

    updated += 1;
  }

  console.log(`Users processed: ${users.length}; updated: ${updated}`);
};

const migrateContent = async () => {
  const [movies, series] = await Promise.all([
    MovieModel.find({}),
    SeriesModel.find({}),
  ]);

  let updated = 0;

  for (const movie of movies) {
    const aiReaction = movie.aiReaction;
    if (!aiReaction || typeof aiReaction !== "object") {
      const nextPayload = {
        intro: "",
        body: "",
        emoji: "",
        tone: "",
        moodTags: [],
        generatedAt: null,
      };

      if (isDryRun) {
        console.log(`[DRY RUN] Would add aiReaction to movie ${movie._id}`);
      } else {
        await MovieModel.updateOne({ _id: movie._id }, { $set: { aiReaction: nextPayload } });
      }
      updated += 1;
    }
  }

  for (const item of series) {
    const aiReaction = item.aiReaction;
    if (!aiReaction || typeof aiReaction !== "object") {
      const nextPayload = {
        intro: "",
        body: "",
        emoji: "",
        tone: "",
        moodTags: [],
        generatedAt: null,
      };

      if (isDryRun) {
        console.log(`[DRY RUN] Would add aiReaction to series ${item._id}`);
      } else {
        await SeriesModel.updateOne({ _id: item._id }, { $set: { aiReaction: nextPayload } });
      }
      updated += 1;
    }
  }

  console.log(`Content processed: ${movies.length + series.length}; aiReaction updates: ${updated}`);
};

const main = async () => {
  const mongoUri = process.env.DB || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("DB connection string not found. Set DB or MONGO_URI in your environment.");
  }

  const connectionOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 10000,
    retryWrites: true,
  };

  mongoose.set("strictQuery", false);
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  console.log(`Connecting to MongoDB... (${isDryRun ? "dry run" : "live run"})`);

  try {
    await mongoose.connect(mongoUri, connectionOptions);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  try {
    await migrateUsers();
    await migrateContent();

    console.log(isDryRun ? "Dry run completed successfully." : "Migration completed successfully.");
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
