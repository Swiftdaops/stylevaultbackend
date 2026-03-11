import 'dotenv/config';
import connectDB from '../src/config/db.js';
import ServiceCatalogItem from '../src/models/ServiceCatalogItem.js';
import { DEFAULT_SERVICE_CATALOG } from '../src/data/serviceCatalog.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  try {
    for (const item of DEFAULT_SERVICE_CATALOG) {
      await ServiceCatalogItem.findOneAndUpdate(
        { slug: item.slug },
        { $set: item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Seeded ${DEFAULT_SERVICE_CATALOG.length} catalog services.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed service catalog:', error.message || error);
    process.exit(1);
  }
}

main();
