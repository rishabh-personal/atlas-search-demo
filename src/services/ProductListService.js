const StandardSearchService = require('./StandardSearchService');

class ProductListService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.standardSearchService = new StandardSearchService(databaseManager);
  }

  /**
   * Build optimized project stage
   * @private
   */
  _buildProjectStage() {
    return {
      _id: 1,
      name: 1,
      sku_code: 1,
      category_name1: 1,
      category_name2: 1,
      category_name3: 1,
      category_name4: 1,
      category_name5: 1,
      category_id1: 1,
      category_id2: 1,
      category_id3: 1,
      category_id4: 1,
      category_id5: 1,
      short_description: 1,
      long_description: 1,
      mrp: 1,
      rsp: 1,
      spp: 1,
      tax_cat_name: 1,
      tax_cat_code: 1,
      selling_uom_name: 1,
      selling_uom_type: 1,
      is_product_active: 1,
      created_at: 1,
      updated_at: 1,
      barcodes: 1
    };
  }

  /**
   * List products with optimized performance
   * @param {string} enterpriseId
   * @param {string} [query]
   * @param {number} skip
   * @param {number} limit
   */
  async list(enterpriseId, query = '', skip = 0, limit = 20) {
    try {
      if (!this.databaseManager.enterpriseCollection) {
        throw new Error('Enterprise collection not initialized');
      }

      if (query && query.trim()) {
        return this.standardSearchService.search(query, enterpriseId, skip, limit);
      }

      // Execute queries in parallel for better performance
      const [results, countResult] = await Promise.all([
        // Get paginated results
        this.databaseManager.enterpriseCollection
          .find({})
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .project(this._buildProjectStage())
          .maxTimeMS(10000)
          .toArray(),

        // Get total count using aggregation
        this.databaseManager.enterpriseCollection
          .aggregate([
            {
              $group: {
                _id: null,
                count: { $sum: 1 }
              }
            }
          ])
          .maxTimeMS(10000)
          .toArray()
      ]);

      return {
        results,
        totalCount: countResult[0]?.count || 0
      };
    } catch (error) {
      console.error('Product list error:', error);
      throw new Error(`Product list failed: ${error.message}`);
    }
  }
}

module.exports = ProductListService; 