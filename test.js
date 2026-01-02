const sdk = require('./index');

console.log('Testing LLM List SDK...');

try {
    // Test 1: Get Providers
    const providers = sdk.getProviders();
    console.log(`\n1. Found ${providers.length} providers:`, providers.map(p => p.id).join(', '));

    if (providers.length > 0) {
        const testProviderId = providers[0].id; // e.g., 'openai'
        console.log(`\nTesting with provider: ${testProviderId}`);

        // Test 2: Get Models
        const models = sdk.getProviderModels(testProviderId);
        console.log(`2. Found ${models.length} models.`);
        if (models.length > 0) {
            console.log(`   Sample model: ${models[0].name} (${models[0].id})`);
        }

        // Test 3: Get Website
        const website = sdk.getProviderWebsite(testProviderId);
        console.log(`3. Website: ${website}`);

        // Test 4: Get Auth
        const auth = sdk.getProviderAuth(testProviderId);
        console.log(`4. Auth Config:`, JSON.stringify(auth, null, 2));
    }

} catch (error) {
    console.error('Test failed:', error);
}
