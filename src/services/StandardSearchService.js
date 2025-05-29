class StandardSearchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Build optimized search stage with improved scoring and relevance
   */
  buildSearchStage(query) {
    // Split query into words and clean them
    const words = query.split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.toLowerCase());
    
    return {
      $search: {
        index: 'im_sku_flat_table_new',
        compound: {
          should: [
            // Primary fields with exact matches and higher boost
            {
              compound: {
                should: [
                  { 
                    text: { 
                      query: words,
                      path: 'name',
                      score: { boost: { value: 6 } }
                    }
                  },
                  { 
                    text: { 
                      query: words,
                      path: 'sku_code',
                      score: { boost: { value: 4 } }
                    }
                  }
                ],
                minimumShouldMatch: 1
              }
            },
            // Category fields with medium boost
            {
              compound: {
                should: [
                  { 
                    text: { 
                      query: words,
                      path: 'category_name1',
                      score: { boost: { value: 2 } }
                    }
                  },
                  { 
                    text: { 
                      query: words,
                      path: 'category_name2',
                      score: { boost: { value: 2 } }
                    }
                  }
                ],
                minimumShouldMatch: 1
              }
            }
          ],
          minimumShouldMatch: 1
        }
      }
    };
  }

  /**
   * Build optimized count stage
   */
  buildCountStage(query) {
    // Split query into words and clean them
    const words = query.split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w.toLowerCase());
    
    return {
      $search: {
        index: 'im_sku_flat_table_new',
        count: {
          type: "total"
        },
        compound: {
          should: [
            // Only search in primary fields for count
            {
              compound: {
                should: [
                  { 
                    text: { 
                      query: words,
                      path: 'name'
                    }
                  },
                  { 
                    text: { 
                      query: words,
                      path: 'sku_code'
                    }
                  }
                ],
                minimumShouldMatch: 1
              }
            }
          ],
          minimumShouldMatch: 1
        }
      }
    };
  }

  /**
   * Get count for search results
   * @param {string} query
   * @param {string} enterpriseId
   */
  async getCount(query, enterpriseId) {
    try {
      if (!query) {
        throw new Error('Search query is required');
      }

      if (!enterpriseId) {
        throw new Error('Enterprise ID is required');
      }

      const searchStage = this.buildSearchStage(query);
      
      // Use optimized count approach with faceted search
      const countResult = await this.databaseManager.enterpriseCollection
        .aggregate([
          searchStage,
          {
            $facet: {
              metadata: [
                { $count: "total" }
              ]
            }
          }
        ])
        .maxTimeMS(30000) // Increased timeout for large result sets
        .toArray();
      
      const count = countResult[0]?.metadata[0]?.total || 0;
      
      return {
        loading: false,
        count,
        error: null
      };
    } catch (error) {
      console.error('Error getting count:', error);
      return {
        loading: false,
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Paginated search
   * @param {string} query
   * @param {string} enterpriseId
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Number of documents to return
   */
  async search(query, enterpriseId, skip = 0, limit = 20) {
    try {
      if (!query) {
        throw new Error('Search query is required');
      }

      if (!enterpriseId) {
        throw new Error('Enterprise ID is required');
      }

      const start = Date.now();
      
      // Build optimized search stage
      const searchStage = this.buildSearchStage(query);

      // Project stage for results with optimized field selection
      const projectStage = {
        $project: {
          _id: 1,
          name: 1,
          sku_code: 1,
          category_name1: 1,
          category_name2: 1,
          short_description: 1,
          score: { $meta: 'searchScore' }
        }
      };

      // Build results pipeline
      const resultsPipeline = [
        searchStage,
        { $skip: skip },
        { $limit: limit },
        projectStage
      ];

      console.log('Results Pipeline:', JSON.stringify(resultsPipeline, null, 2));

      // Execute search query first to get results quickly
      const results = await this.databaseManager.enterpriseCollection
        .aggregate(resultsPipeline)
        .maxTimeMS(10000)
        .toArray();

      const elapsed = Date.now() - start;
      console.log(`Standard search: ${results.length} results in ${elapsed}ms`);

      // Create a count state object that can be updated
      const countState = {
        loading: true,
        count: 0,
        error: null
      };

      // Start count query asynchronously without awaiting it
      this.getCount(query, enterpriseId)
        .then(countResult => {
          countState.count = countResult.count;
          countState.loading = false;
          countState.error = countResult.error;
          console.log(`Total count updated: ${countResult.count}`);
        })
        .catch(error => {
          console.error('Error getting count:', error);
          countState.error = error.message;
          countState.loading = false;
        });

      // Return results immediately with count state
      return {
        results,
        countState
      };
    } catch (error) {
      console.error('Standard search error:', error);
      throw error;
    }
  }
}

module.exports = StandardSearchService; 