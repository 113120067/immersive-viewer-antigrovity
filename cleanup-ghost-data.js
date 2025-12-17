require('dotenv').config();
const { db } = require('./src/config/firebase-admin');

async function cleanup() {
    console.log('Scanning for ghost data (uppercase words)...');
    const collectionRef = db.collection('mnemonic_generations');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log('No documents found in collection.');
        return;
    }

    let ghostCount = 0;
    let batch = db.batch();
    let opCount = 0;
    const BATCH_LIMIT = 450; // Firestore batch limit is 500

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const word = data.word;

        // Check if word exists and has uppercase letters
        if (word && word !== word.toLowerCase()) {
            console.log(`Found ghost entry: "${word}" (ID: ${doc.id}) - Marking for deletion.`);
            batch.delete(doc.ref);
            ghostCount++;
            opCount++;

            // Commit batch if limit reached
            if (opCount >= BATCH_LIMIT) {
                await batch.commit();
                console.log(`Committed batch of ${opCount} deletions...`);
                batch = db.batch();
                opCount = 0;
            }
        }
    }

    // Commit remaining
    if (opCount > 0) {
        await batch.commit();
    }

    console.log('-----------------------------------');
    if (ghostCount > 0) {
        console.log(`✅ Cleanup complete. Deleted ${ghostCount} ghost entries.`);
    } else {
        console.log('✨ No ghost data found. Database is clean!');
    }
}

cleanup().catch(err => {
    console.error('Cleanup failed:', err);
}).finally(() => {
    // Allow time for logs to flush before exit if needed, though simple script usually fine
    process.exit(0);
});
