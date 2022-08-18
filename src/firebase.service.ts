import { FirebaseOptions, initializeApp } from '@firebase/app';
import { getFirestore, connectFirestoreEmulator } from '@firebase/firestore';

const firebaseConfig: FirebaseOptions = {
    apiKey: "API KEY", // ! replace with actual key
    authDomain: 'auth.schedgo.com',
    databaseURL: 'https://scheduleru.firebaseio.com',
    projectId: 'scheduleru',
    storageBucket: 'scheduleru.appspot.com',
    messagingSenderId: '444479030110',
    appId: '1:444479030110:web:2e14270e0c34e9834345cf',
    measurementId: 'G-VPXF00YJRX',
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);


// if (import.meta.env.DEV) {
//     connectFirestoreEmulator(firestore, 'localhost', 8080);
// }

export { firestore };
