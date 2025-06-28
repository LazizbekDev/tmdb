import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600 }); // 1 soat

export async function getPaginatedData(model, page = 1, limit = 10, query = {}) {
  const skip = (page - 1) * limit;
  // Query'ni kesh kaliti sifatida ishlatish uchun JSON string'ga aylantirish
  const queryString = JSON.stringify(query);
  const cacheKey = `${model.modelName.toLowerCase()}:page:${page}:query:${queryString}`;

  // Keshdan ma'lumotni tekshirish
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`🗃️ Keshdan olingan: ${cacheKey}`);
    return cached;
  }

  // Ma'lumotlarni olish
  const data = await model
    .find(query)
    .sort({ _id: -1 })
    .select("name caption movieUrl views")
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCount = await model.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limit);

  const result = { data, totalPages, totalCount };

  // Natijani keshga saqlash
  cache.set(cacheKey, result);
  console.log(`🗃️ Keshga saqlandi: ${cacheKey}`);

  return result;
}