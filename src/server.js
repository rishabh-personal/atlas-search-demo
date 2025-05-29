require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const DatabaseManager = require('./services/DatabaseManager');
const AutocompleteSearchService = require('./services/AutocompleteSearchService');
const StandardSearchService = require('./services/StandardSearchService');
const FuzzySearchService = require('./services/FuzzySearchService');

const app = express();
app.use(cors());
app.use(express.json());

// Response time logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Initialize database manager
const databaseManager = new DatabaseManager();

// Initialize search services
const autocompleteSearchService = new AutocompleteSearchService(databaseManager);
const standardSearchService = new StandardSearchService(databaseManager);
const fuzzySearchService = new FuzzySearchService(databaseManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Autocomplete Search
app.get('/api/search/autocomplete/:enterpriseId', async (req, res) => {
  const startTime = Date.now();
  const { enterpriseId } = req.params;
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`Connecting to enterprise database for ID: ${enterpriseId}`);
    const enterprise = await databaseManager.connectToEnterpriseDB(enterpriseId);
    console.log('Connected to enterprise:', enterprise);
    
    console.log(`Executing autocomplete search for query: ${query}`);
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
    console.error('Autocomplete search error:', error);
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    } else if (error.message.includes('not initialized')) {
      statusCode = 500;
      errorMessage = 'Database connection not initialized';
    }

    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query
      }
    });
  }
});

// Standard Search
app.get('/api/search/standard/:enterpriseId', async (req, res) => {
  const startTime = Date.now();
  const { enterpriseId } = req.params;
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`Connecting to enterprise database for ID: ${enterpriseId}`);
    const enterprise = await databaseManager.connectToEnterpriseDB(enterpriseId);
    console.log('Connected to enterprise:', enterprise);
    
    console.log(`Executing standard search for query: ${query}`);
    const results = await standardSearchService.search(query, enterpriseId);
    
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
    console.error('Standard search error:', error);
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    } else if (error.message.includes('not initialized')) {
      statusCode = 500;
      errorMessage = 'Database connection not initialized';
    }

    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query
      }
    });
  }
});

// Fuzzy Search
app.get('/api/search/fuzzy/:enterpriseId', async (req, res) => {
  const startTime = Date.now();
  const { enterpriseId } = req.params;
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`Connecting to enterprise database for ID: ${enterpriseId}`);
    const enterprise = await databaseManager.connectToEnterpriseDB(enterpriseId);
    console.log('Connected to enterprise:', enterprise);
    
    console.log(`Executing fuzzy search for query: ${query}`);
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
    console.error('Fuzzy search error:', error);
    let statusCode = 500;
    let errorMessage = 'Search failed';

    if (error.message.includes('Enterprise not found')) {
      statusCode = 404;
      errorMessage = 'Enterprise not found';
    } else if (error.message.includes('Collection not found')) {
      statusCode = 404;
      errorMessage = 'Collection not found in enterprise database';
    } else if (error.message.includes('not initialized')) {
      statusCode = 500;
      errorMessage = 'Database connection not initialized';
    }

    const responseTime = Date.now() - startTime;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      metadata: {
        responseTime: `${responseTime}ms`,
        enterpriseId,
        query
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 