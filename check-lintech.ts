import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

async function main() {
  console.log('Querying precise records for KEVEN (1702) and FRANCISCO (1840)...');
  try {
    const snap = await getDocs(collection(db, 'employees'));
    const lintechDocs = snap.docs.filter(doc => {
      const data = doc.data();
      return (
        data.registration === '1702' ||
        data.registration === '1840' ||
        (data.machine && data.machine.toLowerCase() === 'lintech')
      );
    });

    console.log(`Found ${lintechDocs.length} Lintech/Keven/Francisco documents:`);
    lintechDocs.forEach(doc => {
      const data = doc.data();
      console.log(`DocID: ${doc.id}`);
      console.log(JSON.stringify(data, null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
  }
}

main();
