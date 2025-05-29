const express = require('express');
const router = express.Router();
const DatabaseManager = require('../services/DatabaseManager');
const AutocompleteSearchService = require('../services/AutocompleteSearchService');
const StandardSearchService = require('../services/StandardSearchService');
const FuzzySearchService = require('../services/FuzzySearchService');
const WildcardSearchService = require('../services/WildcardSearchService');
const CategorySearchService = require('../services/CategorySearchService');
const TextSearchService = require('../services/TextSearchService');
const ProductListService = require('../services/ProductListService');

const databaseManager = new DatabaseManager();
const autocompleteSearchService = new AutocompleteSearchService(databaseManager);
const standardSearchService = new StandardSearchService(databaseManager);
const fuzzySearchService = new FuzzySearchService(databaseManager);
const wildcardSearchService = new WildcardSearchService(databaseManager);
const categorySearchService = new CategorySearchService(databaseManager);
const textSearchService = new TextSearchService(databaseManager);
const productListService = new ProductListService(databaseManager);

// Connect to master DB on startup
(async () => {
  try {
    await databaseManager.connectToMasterDB();
  } catch (error) {
    process.exit(1);
  }
})();

// Get all enterprises
router.get('/enterprises', async (req, res) => {
  try {
    const enterprises = await databaseManager.getAllEnterprises();
    res.json(enterprises);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enterprises' });
  }
});

// Autocomplete Search
router.get('/search/autocomplete/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const results = await autocompleteSearchService.search(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ 
      error: errorMessage,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query
      }
    });
  }
});

// Standard Search
router.get('/search/standard/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query, skip = 0, limit = 20 } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const { results, countState } = await standardSearchService.search(
      query,
      enterpriseId,
      parseInt(skip, 10),
      parseInt(limit, 10)
    );
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      countState,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ error: errorMessage, metadata: { responseTime: `${responseTime}ms`, enterpriseId, query } });
  }
});

// Standard Search Count
router.get('/search/standard/:enterpriseId/count', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const countState = await standardSearchService.getCount(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      countState,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Count failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ 
      countState: {
        loading: false,
        count: 0,
        error: errorMessage
      },
      metadata: { 
        responseTime: `${responseTime}ms`, 
        enterpriseId, 
        query 
      } 
    });
  }
});

// Fuzzy Search
router.get('/search/fuzzy/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const results = await fuzzySearchService.search(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ error: errorMessage, metadata: { responseTime: `${responseTime}ms`, enterpriseId, query } });
  }
});

// Wildcard Search
router.get('/search/wildcard/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const results = await wildcardSearchService.search(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Category Search
router.get('/search/category/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const results = await categorySearchService.search(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Text Search
router.get('/search/text/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query } = req.query;
  const startTime = Date.now();

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const results = await textSearchService.search(query, enterpriseId);
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ error: errorMessage, metadata: { responseTime: `${responseTime}ms`, enterpriseId, query } });
  }
});

// Product List (recent or search)
router.get('/search/products/:enterpriseId', async (req, res) => {
  const { enterpriseId } = req.params;
  const { query = '', skip = 0, limit = 20 } = req.query;
  const startTime = Date.now();
  try {
    await databaseManager.connectToEnterpriseDB(enterpriseId);
    const { results, totalCount } = await productListService.list(
      enterpriseId,
      query,
      parseInt(skip, 10),
      parseInt(limit, 10)
    );
    const responseTime = Date.now() - startTime;
    res.json({
      results,
      totalCount,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query,
        resultCount: results.length
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = 'Product list failed';
    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    }
    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ error: errorMessage, metadata: { responseTime: `${responseTime}ms`, enterpriseId, query } });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await databaseManager.close();
  process.exit(0);
});

module.exports = router; 