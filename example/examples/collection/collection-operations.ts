import { DiscogsSDK } from '@cr8.audio/discogs-sdk';

export async function collectionExample(sdk: DiscogsSDK) {
    try {
        // Get user identity to get username
        const identity = await sdk.auth.getUserIdentity();
        
        // Get user's collection
        const collection = await sdk.collection.getCollection({
            username: identity.username,
            page: 1,
            perPage: 10
        });

        console.log('First 10 items in collection:', collection);

        // Get folders
        const folders = await sdk.collection.getFolders(identity.username);
        console.log('Collection folders:', folders);

    } catch (error) {
        console.error('Collection operations failed:', error);
        throw error;
    }
} 