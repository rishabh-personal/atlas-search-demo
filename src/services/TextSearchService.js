require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

class TextSearchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async search(query, enterpriseId) {
    if (!query) throw new Error('Search query is required');
    if (!enterpriseId) throw new Error('Enterprise ID is required');
    if (!this.databaseManager.enterpriseCollection) throw new Error('Enterprise collection not initialized');

    const pipeline = [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          compound: {
            should: [
              { text: { query, path: 'name', fuzzy: { maxEdits: 1, prefixLength: 1 }, score: { boost: { value: 3 } } } },
              { text: { query, path: 'sku_code', fuzzy: { maxEdits: 1, prefixLength: 1 }, score: { boost: { value: 2 } } } }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 10 },
      { $project: { _id: 1, name: 1, sku_code: 1, score: { $meta: 'searchScore' } } }
    ];

    return this.databaseManager.enterpriseCollection.aggregate(pipeline).toArray();
  }
}

module.exports = TextSearchService; 