import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

async function main() {
  console.log('Cleaning up Lintech documents in Firestore...');
  try {
    const snap = await getDocs(collection(db, 'employees'));
    const lintechDocs = snap.docs.filter(docRef => {
      const data = docRef.data();
      return data.machine === 'Lintech';
    });

    console.log(`Found ${lintechDocs.length} Lintech documents in total.`);

    // Group active documents by collaborator registration or name
    const activeByCol = new Map<string, any[]>();
    const toDelete: string[] = [];

    for (const d of lintechDocs) {
      const data = d.data();
      const status = data.status || '';
      
      if (status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === 'vaga excluida') {
        console.log(`Scheduling deletion of Excluded Vacancy: ${d.id}`);
        toDelete.push(d.id);
      } else if (status === 'Ativo' || status === 'Atestado' || status === 'Em Contratação') {
        const name = data.name || 'Unknown';
        if (!activeByCol.has(name)) {
          activeByCol.set(name, []);
        }
        activeByCol.get(name)!.push({ id: d.id, ...data });
      }
    }

    // For duplicates of active collaborators, keep the most recently updated one
    for (const [name, list] of activeByCol.entries()) {
      if (list.length > 1) {
        // Sort by updatedAt descending
        list.sort((a, b) => {
          const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tB - tA;
        });

        console.log(`Collaborator ${name} has ${list.length} active documents.`);
        console.log(`Keeping latest: ${list[0].id} (updated: ${list[0].updatedAt})`);
        
        for (let i = 1; i < list.length; i++) {
          console.log(`Scheduling deletion of duplicate: ${list[i].id} (updated: ${list[i].updatedAt})`);
          toDelete.push(list[i].id);
        }
      }
    }

    // Execute deletions
    console.log(`\nExecuting deletion of ${toDelete.length} documents...`);
    for (const id of toDelete) {
      await deleteDoc(doc(db, 'employees', id));
      console.log(`Deleted document: ${id}`);
    }

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

main();
