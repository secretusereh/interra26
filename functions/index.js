const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.redeemPlusCode = functions.https.onCall(async (data, context) => {
    // 1. Verificar que el usuario haya iniciado sesión
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated', 
            'Debes iniciar sesión en la aplicación para canjear un código.'
        );
    }

    const uid = context.auth.uid;
    const codeString = data.code;

    if (!codeString || typeof codeString !== 'string') {
         throw new functions.https.HttpsError('invalid-argument', 'Código no válido o vacío.');
    }

    const db = admin.firestore();
    const codeRef = db.collection('promo_codes').doc(codeString);

    try {
        return await db.runTransaction(async (transaction) => {
            const codeDoc = await transaction.get(codeRef);

            // 2. Verificar si el código existe en la base de datos
            if (!codeDoc.exists) {
                return { success: false, message: 'El código introducido no existe o es incorrecto.' };
            }

            const codeData = codeDoc.data();

            // 3. Verificar si ya fue usado
            if (codeData.used === true) {
                return { success: false, message: 'Este código ya ha sido canjeado anteriormente.' };
            }

            // 4. Calcular caducidad DE FORMA DINÁMICA Y BLINDADA
            let diasDeDuracion = 30; // 30 días por defecto por si te olvidas de ponerlo en Firebase
            if (codeData.durationDays !== undefined) {
                // Forzamos a que sea un número, sin importar si en Firebase lo pusiste como texto, int64 o double
                diasDeDuracion = parseInt(codeData.durationDays, 10);
                if (isNaN(diasDeDuracion) || diasDeDuracion <= 0) diasDeDuracion = 30;
            }

            const durationMs = diasDeDuracion * 24 * 60 * 60 * 1000;
            const expirationDate = new Date(Date.now() + durationMs);

            // 5. Quemar el código para que no se vuelva a usar
            transaction.update(codeRef, {
                used: true,
                usedBy: uid, 
                usedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 6. Ascender al usuario a PLUS
            const userRef = db.collection('usuarios').doc(uid);
            transaction.set(userRef, {
                plan: 'PLUS',
                premiumUntil: expirationDate, // Válido por los días exactos que marcaba el código
                hasSeenPlusWelcome: false 
            }, { merge: true });

            return { success: true, message: `Código canjeado correctamente por ${diasDeDuracion} días.` };
        });

    } catch (error) {
        console.error("Fallo crítico en la transacción de canjeo: ", error);
        throw new functions.https.HttpsError('internal', 'Error interno procesando el código en el servidor.');
    }
});