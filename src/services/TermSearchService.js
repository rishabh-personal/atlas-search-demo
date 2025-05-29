class TermSearchService {
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
              { term: { query, path: 'name' } },
              { term: { query, path: 'sku_code' } }
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

module.exports = TermSearchService; 