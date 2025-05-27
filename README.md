# MongoDB Atlas Search Demo

This is a complete Node.js Express application that demonstrates MongoDB Atlas Search capabilities with optimized pagination and caching.

## Features

- Full-text search with MongoDB Atlas Search
- Optimized pagination
- Response caching
- Real-time search results
- Count-only queries
- Health check endpoint
- Cache management
- Modern UI with responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account with a cluster
- MongoDB Atlas Search index configured

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd atlas-search-demo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
DB_NAME=your_database_name
```

4. Configure MongoDB Atlas Search Index:
   - Go to your MongoDB Atlas cluster
   - Navigate to the "Search" tab
   - Create a new search index on the `im_sku_flat_table` collection
   - Use the following index configuration:
   ```json
   {
     "mappings": {
       "dynamic": false,
       "fields": {
         "name": { "type": "autocomplete" },
         "sku_code": { "type": "autocomplete" },
         "vendor_item_id": { "type": "autocomplete" },
         "ref_item_code": { "type": "autocomplete" },
         "ref_sku_code": { "type": "autocomplete" },
         "category_name1": { "type": "autocomplete" },
         "category_name2": { "type": "autocomplete" },
         "category_name3": { "type": "autocomplete" },
         "category_name4": { "type": "autocomplete" },
         "category_name5": { "type": "autocomplete" },
         "barcodes": {
           "type": "document",
           "fields": {
             "type": { "type": "autocomplete" },
             "barcode": { "type": "autocomplete" }
           }
         },
         "a1": { "type": "autocomplete" },
         "a2": { "type": "autocomplete" },
         "a3": { "type": "autocomplete" },
         "a4": { "type": "autocomplete" },
         "a5": { "type": "autocomplete" },
         "a6": { "type": "autocomplete" },
         "a7": { "type": "autocomplete" },
         "a8": { "type": "autocomplete" },
         "a9": { "type": "autocomplete" },
         "a10": { "type": "autocomplete" },
         "a11": { "type": "autocomplete" },
         "a12": { "type": "autocomplete" },
         "a13": { "type": "autocomplete" },
         "a14": { "type": "autocomplete" },
         "a15": { "type": "autocomplete" },
         "a16": { "type": "autocomplete" },
         "a17": { "type": "autocomplete" },
         "a18": { "type": "autocomplete" },
         "a19": { "type": "autocomplete" },
         "a20": { "type": "autocomplete" },
         "a21": { "type": "autocomplete" },
         "a22": { "type": "autocomplete" },
         "a23": { "type": "autocomplete" },
         "a24": { "type": "autocomplete" },
         "a25": { "type": "autocomplete" },
         "a26": { "type": "autocomplete" },
         "a27": { "type": "autocomplete" },
         "a28": { "type": "autocomplete" },
         "a29": { "type": "autocomplete" },
         "a30": { "type": "autocomplete" },
         "a31": { "type": "autocomplete" },
         "a32": { "type": "autocomplete" },
         "a33": { "type": "autocomplete" },
         "a34": { "type": "autocomplete" },
         "a35": { "type": "autocomplete" }
       }
     }
   }
   ```

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. For production:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/search?q=<query>&page=<page>&limit=<limit>`
  - Search endpoint with pagination
  - Query parameters:
    - `q`: Search query (required)
    - `page`: Page number (default: 1)
    - `limit`: Results per page (default: 10)
    - `countOnly`: Set to 'true' for count-only query

- `GET /api/health`
  - Health check endpoint
  - Returns server status and cache statistics

- `DELETE /api/cache`
  - Clear the application cache

## Features

1. **Optimized Search**
   - Uses MongoDB Atlas Search with compound queries
   - Field-specific boosting for better relevance
   - Fuzzy matching for typo tolerance
   - Minimum score threshold for quality results

2. **Caching**
   - In-memory caching with 5-minute TTL
   - Cache invalidation endpoint
   - Cache statistics in health check

3. **Pagination**
   - Efficient skip/limit pagination
   - Total count and page information
   - Previous/Next navigation
   - Page number display

4. **UI Features**
   - Real-time search results
   - Loading indicators
   - Error handling
   - Responsive design
   - Score display
   - Execution time tracking
   - Cache status indicator

## Error Handling

The application includes comprehensive error handling for:
- Invalid search queries
- Database connection issues
- Search execution errors
- Cache operations
- API request validation

## Performance Considerations

1. **Search Optimization**
   - Uses compound queries for better relevance
   - Field-specific boosting
   - Minimum score threshold
   - Efficient pagination

2. **Caching Strategy**
   - 5-minute TTL for cache entries
   - Cache key includes all query parameters
   - Cache statistics monitoring

3. **Response Optimization**
   - Projected fields to minimize data transfer
   - Efficient count queries
   - Pagination metadata

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 