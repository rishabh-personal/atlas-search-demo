class FuzzySearchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async search(query, enterpriseId) {
    try {
      if (!query) {
        throw new Error('Search query is required');
      }

      if (!enterpriseId) {
        throw new Error('Enterprise ID is required');
      }

      const pipeline = [
        {
          $search: {
            index: 'im_sku_flat_table_new',
            compound: {
              should: [
                { text: { query, path: 'name', fuzzy: { maxEdits: 2, prefixLength: 1 } } },
                { text: { query, path: 'sku_code', fuzzy: { maxEdits: 2, prefixLength: 1 } } },
                { text: { query, path: 'short_description', fuzzy: { maxEdits: 2, prefixLength: 1 } } }
              ],
              minimumShouldMatch: 1
            }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            sku_code: 1,
            short_description: 1,
            category_name1: 1,
            category_name2: 1,
            category_name3: 1,
            category_name4: 1,
            category_name5: 1,
            barcodes: 1,
            score: { $meta: 'searchScore' }
          }
        },
        { $limit: 10 }
      ];

      console.log('Executing fuzzy search pipeline:', JSON.stringify(pipeline, null, 2));

      const results = await this.databaseManager.enterpriseCollection
        .aggregate(pipeline)
        .maxTimeMS(1000)
        .toArray();

      console.log(`Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Fuzzy search error:', error);
      throw error;
    }
  }
}

module.exports = FuzzySearchService; 