import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

async function main() {
  console.log('Searching for Jocelan in Firestore...');
  try {
    const empSnap = await getDocs(collection(db, 'employees'));
    const matchingEmps = empSnap.docs.filter(doc => {
      const name = doc.data().name || '';
      return name.toLowerCase().includes('jocelan');
    });

    console.log(`Matching Employees: ${matchingEmps.length}`);
    matchingEmps.forEach(doc => {
      console.log(`DocID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

    const colSnap = await getDocs(collection(db, 'collaborators'));
    const matchingCols = colSnap.docs.filter(doc => {
      const name = doc.data().name || '';
      return name.toLowerCase().includes('jocelan');
    });

    console.log(`\nMatching Collaborators: ${matchingCols.length}`);
    matchingCols.forEach(doc => {
      console.log(`DocID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

  } catch (error) {
    console.error('Error finding Jocelan:', error);
  }
}

main();
