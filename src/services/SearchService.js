class SearchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  // Autocomplete Search (using edgeGram tokenization)
  buildAutocompletePipeline(query, enterpriseId) {
    return [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          compound: {
            should: [
              {
                autocomplete: {
                  query: query,
                  path: 'name',
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 1
                  }
                }
              },
              {
                autocomplete: {
                  query: query,
                  path: 'sku_code',
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 1
                  }
                }
              },
              {
                autocomplete: {
                  query: query,
                  path: 'short_description',
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 1
                  }
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      {
        $match: {
          enterprise_id: enterpriseId
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
  }

  // Standard Search (full-text)
  buildStandardPipeline(query, enterpriseId) {
    return [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          text: {
            query: query,
            path: {
              wildcard: '*'
            }
          }
        }
      },
      {
        $match: {
          enterprise_id: enterpriseId
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
  }

  // Fuzzy Search
  buildFuzzyPipeline(query, enterpriseId) {
    return [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          fuzzy: {
            query: query,
            path: ['name', 'sku_code', 'short_description'],
            maxEdits: 2,
            prefixLength: 1
          }
        }
      },
      {
        $match: {
          enterprise_id: enterpriseId
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
  }

  // Wildcard Search
  buildWildcardPipeline(query, enterpriseId) {
    return [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          wildcard: {
            query: `*${query}*`,
            path: ['name', 'sku_code', 'short_description'],
            allowAnalyzedField: true
          }
        }
      },
      {
        $match: {
          enterprise_id: enterpriseId
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
  }

  // Category-based Search
  buildCategoryPipeline(query, enterpriseId) {
    return [
      {
        $search: {
          index: 'im_sku_flat_table_new',
          compound: {
            should: [
              {
                text: {
                  query: query,
                  path: ['category_name1', 'category_name2', 'category_name3', 'category_name4', 'category_name5']
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          enterprise_id: enterpriseId
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
  }

  async search(query, enterpriseId) {
    try {
      if (!query) {
        throw new Error('Search query is required');
      }

      if (!enterpriseId) {
        throw new Error('Enterprise ID is required');
      }

      // For now, we'll use autocomplete search by default
      const pipeline = this.buildAutocompletePipeline(query, enterpriseId);

      console.log('Executing search pipeline:', JSON.stringify(pipeline, null, 2));

      const results = await this.databaseManager.enterpriseCollection
        .aggregate(pipeline)
        .maxTimeMS(1000)
        .toArray();

      console.log(`Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Search error details:', error);
      throw error;
    }
  }
}

module.exports = SearchService; 