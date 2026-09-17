import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

async function main() {
  console.log('Querying Firestore employees...');
  try {
    const snap = await getDocs(collection(db, 'employees'));
    console.log(`Found ${snap.size} employees in collection:`);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | Name: ${data.name} | Registration: ${data.registration} | Sector: ${data.sector} | Machine: ${data.machine} | Shift: ${data.shift} | Status: ${data.status}`);
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
  }
}

main();
