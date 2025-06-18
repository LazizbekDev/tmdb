import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600 }); // 1 soat

export async function getPaginatedData(model, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const cacheKey = `${model.modelName.toLowerCase()}:page:${page}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await model
    .find({})
    .sort({ _id: -1 })
    .select("name caption movieUrl views")
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCount = await model.countDocuments();
  const totalPages = Math.ceil(totalCount / limit);

  cache.set(cacheKey, { data, totalPages, totalCount });
  return { data, totalPages, totalCount };
}