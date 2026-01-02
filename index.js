let localRegistry = null;

// 环境检测与初始化
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// 在 Node.js 环境下尝试加载本地文件
if (isNode) {
    try {
        const fs = require('fs');
        const path = require('path');
        const localRegistryPath = path.resolve(__dirname, './llm_registry.json');

        if (fs.existsSync(localRegistryPath)) {
            const fileContent = fs.readFileSync(localRegistryPath, 'utf-8');
            localRegistry = JSON.parse(fileContent);
        }
    } catch (e) {
        // 在打包环境（如 Webpack/Rollup）中，require('fs') 可能会被 stub 为空对象或报错
        // 这里忽略错误，以便在浏览器中继续运行
        // console.warn(`[LLM-List SDK] Failed to load local registry: ${e.message}`);
        localRegistry = null;
    }
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
     * 支持 Node.js (https) 和 浏览器 (fetch) 环境
     * @param {string} [url] - 自定义 URL，默认为 GitHub Raw 源
     * @returns {Promise<LLMRegistry>}
     */
    static async fetch(url = 'https://raw.githubusercontent.com/lone-yu-cmd/LLM-List/main/llm_registry.json') {
        // Prioritize native fetch (Browser / Node 18+)
        if (typeof fetch === 'function') {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                return new LLMRegistry(json);
            } catch (error) {
                throw new Error(`Failed to fetch registry: ${error.message}`);
            }
        }

        // Fallback to https module (Node < 18)
        if (typeof require !== 'undefined') {
            const https = require('https');
            return new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    if (res.statusCode !== 200) {
                        res.resume();
                        return reject(new Error(`HTTP error! status: ${res.statusCode}`));
                    }

                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
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

        throw new Error('Environment not supported: global fetch and https module are both unavailable.');
    }


    /**
     * Method 1: Get all providers
     * @returns {Array} List of all providers
     */
    getProviders() {
        return this.registry && this.registry.providers ? this.registry.providers : [];
    }

    /**
     * Method 2: Get models for a specific provider
     * @param {string} providerId - The ID of the provider
     * @returns {Array} List of models for the provider
     */
    getProviderModels(providerId) {
        if (!this.registry) return [];
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
        if (!this.registry) return null;
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
        if (!this.registry) return null;
        const provider = this.registry.providers.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Provider with ID '${providerId}' not found.`);
        }
        return provider.api_config && provider.api_config.auth ? provider.api_config.auth : null;
    }
}

module.exports = new LLMRegistry();
module.exports.LLMRegistry = LLMRegistry;
