import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
import readline from 'readline';

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

export async function basicAuthExample() {
    const sdk = new DiscogsSDK({
        DiscogsConsumerKey: process.env.CONSUMER_KEY!,
        DiscogsConsumerSecret: process.env.CONSUMER_SECRET!,
        callbackUrl: 'http://localhost:4567/callback',
        userAgent: 'DiscogsSDKExample/1.0 +https://github.com/yourusername/discogs-sdk'
    });

    try {
        // Get the authorization URL
        const authUrl = await sdk.auth.getAuthorizationUrl();
        console.log('\nPlease visit this URL to authorize the application:');
        console.log(authUrl);

        // Create readline interface for user input
        const rl = createReadlineInterface();

        // Wait for user to authorize and get the verifier
        const verifier = await new Promise<string>((resolve) => {
            rl.question('\nEnter the verifier code from the authorization page: ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
        // Complete authentication with the verifier
        await sdk.auth.handleCallback({
            oauthVerifier: verifier,
            oauthToken: authUrl.split('oauth_token=')[1]
        });

        console.log('Successfully authenticated!');

        // Get and display user identity
        const identity = await sdk.auth.getUserIdentity();
        console.log('Logged in as:', identity.username);

        return sdk; // Return the authenticated SDK instance

    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
}
