const { MongoClient } = require('mongodb');

const uri = 'YOUR_MONGODB_ATLAS_CONNECTION_STRING'; // <-- Replace this!
const dbName = 'YOUR_DB_NAME'; // <-- Replace this!
const collectionName = 'im_sku_flat_table_new';

async function runTest() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const pipeline = [
      {
        $search: {
          index: "im_sku_flat_table_new",
          compound: {
            should: [
              {
                text: {
                  query: "boys",
                  path: [
                    "name", "sku_code",
                    "category_name1", "category_name2", "category_name3", "category_name4", "category_name5",
                    "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10",
                    "a11", "a12", "a13", "a14", "a15", "a16", "a17", "a18", "a19", "a20",
                    "a21", "a22", "a23", "a24", "a25", "a26", "a27", "a28", "a29", "a30",
                    "a31", "a32", "a33", "a34", "a35"
                  ],
                  fuzzy: { maxEdits: 1, prefixLength: 1 },
                  score: { boost: { value: 3 } }
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $skip: 0 },
      { $limit: 20 },
      {
        $project: {
          _id: 1,
          name: 1,
          sku_code: 1,
          score: { $meta: "searchScore" }
        }
      }
    ];

    const start = Date.now();
    const results = await collection.aggregate(pipeline, { maxTimeMS: 30000 }).toArray();
    const elapsed = Date.now() - start;

    console.log(`Query time: ${elapsed} ms`);
    console.log(`Results count: ${results.length}`);
    if (results.length > 0) {
      console.log('Sample result:', results[0]);
    }
  } catch (err) {
    console.error('Error running test:', err);
  } finally {
    await client.close();
  }
}

runTest(); 