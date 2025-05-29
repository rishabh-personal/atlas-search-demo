class AutocompleteSearchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async search(query, enterpriseId) {
    if (!query) {
      throw new Error('Search query is required');
    }

    if (!enterpriseId) {
      throw new Error('Enterprise ID is required');
    }

    if (!this.databaseManager.enterpriseCollection) {
      throw new Error('Enterprise collection not initialized');
    }

    const pipeline = [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          compound: {
            should: [
              {
                autocomplete: {
                  query: query,
                  path: 'name',
                  score: { boost: { value: 3 } }
                }
              },
              {
                autocomplete: {
                  query: query,
                  path: 'sku_code',
                  score: { boost: { value: 2 } }
                }
              }
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
          score: { $meta: 'searchScore' }
        }
      },
      { $limit: 5 }
    ];

    return this.databaseManager.enterpriseCollection
      .aggregate(pipeline)
      .maxTimeMS(1000)
      .toArray();
  }
}

module.exports = AutocompleteSearchService; 