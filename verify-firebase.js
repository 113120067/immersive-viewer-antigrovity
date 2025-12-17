const { db } = require('./src/config/firebase-admin');

async function checkLog() {
    if (!db) {
        console.error('Database connection failed.');
        process.exit(1);
    }

    console.log('Searching for word: Blow...');
    try {
        const snapshot = await db.collection('mnemonic_generations')
            .where('word', '==', 'Blow')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('Result: NOT FOUND. No logs found for "Blow".');
        } else {
            const doc = snapshot.docs[0];
            console.log('Result: FOUND!');
            console.log('ID:', doc.id);
            console.log('Data:', JSON.stringify(doc.data(), null, 2));
        }
    } catch (error) {
        console.error('Query failed:', error);
    }
}

checkLog();
