import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

async function main() {
  console.log('Checking for registration 0023 or ID e23 in employees collection...');
  try {
    const snap = await getDocs(collection(db, 'employees'));
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.registration === '0023' || doc.id === 'e23') {
        console.log(`Found Match! DocID: ${doc.id}`);
        console.log(JSON.stringify(data, null, 2));
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
