import { DiscogsSDK } from '@cr8.audio/discogs-sdk';

export async function searchExample(sdk: DiscogsSDK) {
    try {
        const basic = await sdk.search.getSearchResults({
            query: 'Dark Side of the Moon',
            type: 'release'
        });
        console.log(`Basic search: ${basic.pagination.items} matches`);
        console.log(basic.results.slice(0, 5));

        const advanced = await sdk.search.getSearchResults({
            query: 'Miles Davis',
            type: 'release',
            year: '1959',
            format: 'album',
            perPage: 10
        });
        console.log(`Advanced search: ${advanced.pagination.items} matches`);
        console.log(advanced.results);

    } catch (error) {
        console.error('Search operations failed:', error);
        throw error;
    }
} 