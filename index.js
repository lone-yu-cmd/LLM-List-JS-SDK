const https = require('https');
const fs = require('fs');
const path = require('path');

let localRegistry = null;

// 自动同步策略：如果发现根目录有更新的 Registry 文件，直接覆盖到当前目录
// 这样可以确保 SDK 始终使用最新的数据，且不需要手动运行构建脚本同步
try {
    const rootRegistryPath = path.resolve(__dirname, '../../llm_registry.json');
    const localRegistryPath = path.resolve(__dirname, './llm_registry.json');

    // 仅当根目录文件存在时才尝试同步（区分本地开发环境和 NPM 生产环境）
    if (fs.existsSync(rootRegistryPath)) {
        try {
            // 读取根目录文件内容
            const rootContent = fs.readFileSync(rootRegistryPath);
            // 写入/覆盖到当前目录
            fs.writeFileSync(localRegistryPath, rootContent);
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[LLM-List SDK] Auto-synced registry from project root to: ${localRegistryPath}`);
            }
        } catch (syncError) {
            console.warn(`[LLM-List SDK] Failed to sync from root registry: ${syncError.message}`);
        }
    }

    // 无论是否同步成功，都尝试加载当前目录的 JSON
    // 如果同步成功，这里加载的就是最新的；如果同步失败（或无根文件），加载的就是旧的或报错
    if (fs.existsSync(localRegistryPath)) {
         // 使用 fs 读取而不是 require，避免 require 缓存导致无法加载刚刚覆盖的新文件
        const fileContent = fs.readFileSync(localRegistryPath, 'utf-8');
        localRegistry = JSON.parse(fileContent);
    }
} catch (e) {
    console.warn(`[LLM-List SDK] Failed to load local registry: ${e.message}`);
    localRegistry = null;
}

class LLMRegistry {
    /**
     * 初始化 Registry SDK
     * @param {Object} [data] - 手动传入的 Registry 数据，如果不传则尝试使用本地打包的数据
     */
    constructor(data) {
        this.registry = data || localRegistry;
        if (!this.registry) {
            console.warn("Warning: No local registry found. Please use LLMRegistry.fetch() or provide data in constructor.");
        }
    }

    /**
     * 静态方法：从远程 URL 获取最新的 Registry 数据并初始化 SDK
     * @param {string} [url] - 自定义 URL，默认为 GitHub Raw 源
     * @returns {Promise<LLMRegistry>}
     */
    static async fetch(url = 'https://raw.githubusercontent.com/lone-yu-cmd/LLM-List/main/llm_registry.json') {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';

                // A chunk of data has been received.
                res.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received.
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(new LLMRegistry(json));
                    } catch (error) {
                        reject(new Error(`Failed to parse registry JSON: ${error.message}`));
                    }
                });

            }).on('error', (err) => {
                reject(new Error(`Failed to fetch registry: ${err.message}`));
            });
        });
    }


    /**
     * Method 1: Get all providers
     * @returns {Array} List of all providers
     */
    getProviders() {
        return this.registry.providers;
    }

    /**
     * Method 2: Get models for a specific provider
     * @param {string} providerId - The ID of the provider
     * @returns {Array} List of models for the provider
     */
    getProviderModels(providerId) {
        const provider = this.registry.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider with ID '${providerId}' not found.`);
        }
        return provider.models || [];
    }

    /**
     * Method 3: Get provider's API website
     * @param {string} providerId - The ID of the provider
     * @returns {string} The website URL of the provider
     */
    getProviderWebsite(providerId) {
        const provider = this.registry.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider with ID '${providerId}' not found.`);
        }
        return provider.website;
    }

    /**
     * Method 4: Get provider's auth configuration
     * @param {string} providerId - The ID of the provider
     * @returns {Object} The auth configuration object
     */
    getProviderAuth(providerId) {
        const provider = this.registry.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider with ID '${providerId}' not found.`);
        }
        return provider.api_config && provider.api_config.auth ? provider.api_config.auth : null;
    }
}

module.exports = new LLMRegistry();
module.exports.LLMRegistry = LLMRegistry;
