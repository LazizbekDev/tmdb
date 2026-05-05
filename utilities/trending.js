import AccessLog from "#model/AccessLog.js";
import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";

export const getTrendingContent = async (limit = 5, days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const trending = await AccessLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$contentId", count: { $sum: 1 }, type: { $first: "$contentType" } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  const results = [];
  for (const item of trending) {
    const Model = item.type === "Movie" ? Movie : Series;
    const data = await Model.findById(item._id);
    if (data) {
      results.push({ type: item.type.toLowerCase(), data, count: item.count });
    }
  }
  
  return results;
};
