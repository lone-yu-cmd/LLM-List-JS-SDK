const https = require('https');
const fs = require('fs');
const path = require('path');
const llmJsonPath = 'https://raw.githubusercontent.com/lone-yu-cmd/LLM-List/main/llm_registry.json'

/**
 * 配置常量
 */
const CONFIG = {
    REMOTE_URL: llmJsonPath,
    LOCAL_PATH: path.resolve(__dirname, '../llm_registry.json')
};

/**
 * 格式化日志输出
 * @param {string} type - 日志类型 (INFO, ERROR, SUCCESS)
 * @param {string} message - 日志内容
 */
function log(type, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

/**
 * 通过 HTTPS 获取远程文件内容
 * @param {string} url - 远程文件 URL
 * @returns {Promise<string>} - 文件内容字符串
 */
function fetchRemoteFile(url) {
    return new Promise((resolve, reject) => {
        log('INFO', `开始下载文件: ${url}`);
        
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`请求失败，状态码: ${res.statusCode}`));
            }

            let data = '';
            res.setEncoding('utf8');
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                log('INFO', '文件下载完成');
                resolve(data);
            });

        }).on('error', (err) => {
            reject(new Error(`网络请求错误: ${err.message}`));
        });
    });
}

/**
 * 验证 JSON 格式
 * @param {string} content - JSON 字符串
 * @returns {boolean} - 是否有效
 */
function isValidJSON(content) {
    try {
        JSON.parse(content);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 获取文件权限
 * @param {string} filePath - 文件路径
 * @returns {number|null} - 文件权限模式或 null
 */
function getFileMode(filePath) {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.mode;
    }
    return null;
}

/**
 * 主执行函数
 */
async function main() {
    const startTime = Date.now();
    log('INFO', '=== 开始同步 llm_registry.json ===');

    try {
        // 1. 获取远程文件
        const remoteContent = await fetchRemoteFile(CONFIG.REMOTE_URL);

        // 2. 验证 JSON 格式
        if (!isValidJSON(remoteContent)) {
            throw new Error('远程文件不是有效的 JSON 格式');
        }
        log('SUCCESS', 'JSON 格式验证通过');

        // 3. 准备文件操作
        const originalMode = getFileMode(CONFIG.LOCAL_PATH);
        
        // 4. 写入新文件
        fs.writeFileSync(CONFIG.LOCAL_PATH, remoteContent, 'utf8');
        log('SUCCESS', '文件替换成功');

        // 5. 恢复权限 (如果之前存在)
        if (originalMode) {
            fs.chmodSync(CONFIG.LOCAL_PATH, originalMode);
            log('INFO', '文件权限已恢复');
        }

        // 6. 验证写入结果
        const writtenContent = fs.readFileSync(CONFIG.LOCAL_PATH, 'utf8');
        if (writtenContent === remoteContent) {
            log('SUCCESS', '本地文件内容校验一致');
        } else {
            throw new Error('本地文件写入后校验失败');
        }

    } catch (err) {
        log('ERROR', `同步失败: ${err.message}`);
        process.exit(1);
    } finally {
        const duration = (Date.now() - startTime) / 1000;
        log('INFO', `=== 同步结束，耗时 ${duration}s ===`);
    }
}

// 执行脚本
main();
