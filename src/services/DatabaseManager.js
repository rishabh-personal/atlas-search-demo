const { MongoClient, ObjectId } = require('mongodb');

class DatabaseManager {
  constructor() {
    this.masterDb = null;
    this.masterClient = null;
    this.enterpriseClients = {}; // Map of enterpriseId -> { client, db, collection }
    this.enterpriseDb = null;
    this.enterpriseClient = null;
    this.enterpriseCollection = null;
  }

  async connectToMasterDB() {
    try {
      this.masterClient = new MongoClient(process.env.MONGODB_URI);
      await this.masterClient.connect();
      this.masterDb = this.masterClient.db('crm-production');
      console.log('Connected to Master MongoDB');
    } catch (error) {
      console.error('Master MongoDB connection error:', error);
      throw error;
    }
  }

  async connectToEnterpriseDB(enterpriseId) {
    try {
      // First connect to master DB if not already connected
      if (!this.masterDb) {
        await this.connectToMasterDB();
      }

      // If already connected to this enterprise, reuse
      if (this.enterpriseClients[enterpriseId]) {
        const { db, client, collection } = this.enterpriseClients[enterpriseId];
        this.enterpriseDb = db;
        this.enterpriseClient = client;
        this.enterpriseCollection = collection;
        return {
          enterpriseId,
          enterpriseName: null // Name not available here, but not needed for reuse
        };
      }

      // Get enterprise details from master DB
      const enterprise = await this.masterDb.collection('enterprises').findOne({ 
        _id: new ObjectId(enterpriseId),
        deletedOn: null 
      });

      if (!enterprise) {
        throw new Error(`Enterprise not found with ID: ${enterpriseId}`);
      }

      if (!enterprise.meta?.dbConfig?.dbName) {
        throw new Error('Enterprise database configuration not found');
      }

      console.log('Found enterprise:', {
        id: enterprise._id,
        name: enterprise.tradeName,
        dbName: enterprise.meta.dbConfig.dbName
      });

      // Connect to enterprise database (do not close previous, just reuse or keep open)
      console.log('Connecting to enterprise database...');
      const client = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      await client.connect();
      console.log('Connected to MongoDB');

      const dbName = enterprise.meta.dbConfig.dbName;
      const collectionName = 'im_sku_flat_table';
      console.log(`Using database: ${dbName}, collection: ${collectionName}`);
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Cache the connection for this enterpriseId
      this.enterpriseClients[enterpriseId] = { client, db, collection };
      this.enterpriseDb = db;
      this.enterpriseClient = client;
      this.enterpriseCollection = collection;

      return {
        enterpriseId,
        enterpriseName: enterprise.tradeName
      };
    } catch (error) {
      console.error('Error connecting to enterprise database:', error);
      throw error;
    }
  }

  async getAllEnterprises() {
    try {
      if (!this.masterDb) {
        await this.connectToMasterDB();
      }
      const enterprises = await this.masterDb.collection('enterprises')
        .find({ 
          deletedOn: null,
          liveStatus: 1
        })
        .project({
          _id: 1,
          tradeName: 1,
          legalName: 1,
          baCode: 1,
          email: 1,
          'meta.dbConfig.dbName': 1
        })
        .toArray();

      console.log('Raw enterprises from DB:', enterprises);
      return enterprises;
    } catch (error) {
      console.error('Error in getAllEnterprises:', error);
      throw error;
    }
  }

  async closeAll() {
    // Close all enterprise clients
    for (const { client } of Object.values(this.enterpriseClients)) {
      await client.close();
    }
    this.enterpriseClients = {};
    if (this.masterClient) await this.masterClient.close();
  }
}

module.exports = DatabaseManager; 