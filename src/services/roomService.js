// Room Service - Firestore operations for rooms
import { db, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from '../firebase.js';

const ROOMS_COLLECTION = 'rooms';

/**
 * Fetch all rooms from Firestore
 */
export const fetchRooms = async () => {
    try {
        const roomsRef = collection(db, ROOMS_COLLECTION);
        const snapshot = await getDocs(roomsRef);

        const rooms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`Fetched ${rooms.length} rooms from Firestore`);
        return rooms;
    } catch (error) {
        console.error('Error fetching rooms from Firestore:', error);
        throw error;
    }
};

/**
 * Add a new room to Firestore
 */
export const addRoom = async (roomData) => {
    try {
        const roomsRef = collection(db, ROOMS_COLLECTION);

        const roomToAdd = {
            ...roomData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Remove the local id if present (Firestore will generate its own)
        delete roomToAdd.id;

        const docRef = await addDoc(roomsRef, roomToAdd);

        console.log('Room added with ID:', docRef.id);
        return {
            id: docRef.id,
            ...roomData
        };
    } catch (error) {
        console.error('Error adding room to Firestore:', error);
        throw error;
    }
};

/**
 * Update an existing room in Firestore
 */
export const updateRoom = async (roomId, roomData) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);

        const roomToUpdate = {
            ...roomData,
            updatedAt: serverTimestamp()
        };

        // Remove id from the data (it's in the document path)
        delete roomToUpdate.id;

        await updateDoc(roomRef, roomToUpdate);

        console.log('Room updated:', roomId);
        return {
            id: roomId,
            ...roomData
        };
    } catch (error) {
        console.error('Error updating room in Firestore:', error);
        throw error;
    }
};

/**
 * Delete a room from Firestore
 */
export const deleteRoom = async (roomId) => {
    try {
        const roomRef = doc(db, ROOMS_COLLECTION, roomId);
        await deleteDoc(roomRef);

        console.log('Room deleted:', roomId);
        return true;
    } catch (error) {
        console.error('Error deleting room from Firestore:', error);
        throw error;
    }
};

/**
 * Initialize Firestore with rooms from static data (one-time migration)
 */
export const migrateRoomsToFirestore = async (staticRooms) => {
    try {
        // First check if rooms already exist
        const existingRooms = await fetchRooms();

        if (existingRooms.length > 0) {
            console.log('Rooms already exist in Firestore, skipping migration');
            return existingRooms;
        }

        console.log('Migrating rooms to Firestore...');

        const migratedRooms = [];
        for (const room of staticRooms) {
            const addedRoom = await addRoom(room);
            migratedRooms.push(addedRoom);
        }

        console.log(`Migrated ${migratedRooms.length} rooms to Firestore`);
        return migratedRooms;
    } catch (error) {
        console.error('Error migrating rooms to Firestore:', error);
        throw error;
    }
};
