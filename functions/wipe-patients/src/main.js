// Import Appwrite SDK using ES module imports
import { Client, Databases, Query } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
const mainFunction = async ({ res }) => {
  // Get the Appwrite client
  const client = new Client();
  const databases = new Databases(client);

  // Set the client configuration
  client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('68025992000ccf9a9d9d')
    .setKey('standard_cadca0053251a0745c563d55325a3f4fdfb7676bbd701b7b85043e33529e5253afcd60fc9d75b6434be6d4cb63631a9868d0d240aa50a8cb434631ef665896781501809893d352171723690123997a8cd3a3066459080dca125510beba03dd96cd4d2b1adba738f2d441786869329038096277322f4400b0664a070b99b901cb');

  // Get all collections in the database
  const documents = await databases.listDocuments('Core', 'Patients', [Query.limit(10000000)]);

  // Loop through each collection and delete it
  for (const document of documents.documents) {
    try {
      databases.deleteDocument('Core', 'Patients', document.$id);
    } catch {}
  }

  return res.json({ message: 'All documents deleted successfully' });
};

export default mainFunction;


