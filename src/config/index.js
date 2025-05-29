require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  masterDbName: 'crm-production',
  enterpriseCollection: 'im_sku_flat_table'
}; 