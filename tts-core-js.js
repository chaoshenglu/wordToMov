// Node.js环境下动态导入fetch
let fetchModule = null;
if (typeof fetch === 'undefined') {
    fetchModule = import('node-fetch').then(module => {
        global.fetch = module.default;
        return module.default;
    });
}

/**
 * Google Cloud Text-to-Speech API 核心封装
 */
class GoogleTTS {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
    }

    /**
     * 文本转语音
     * @param {string} text - 要转换的文本
     * @param {string} gender - 语音性别 'male' 或 'female'
     * @returns {Promise<string>} - 返回音频的 Blob URL
     */
    async textToSpeech(text, gender = 'female') {
        if (!text || !text.trim()) {
            throw new Error('Text cannot be empty');
        }

        if (!this.apiKey) {
            throw new Error('API key is required');
        }

        // 根据性别选择语音
        const voiceConfig = this.getVoiceConfig(gender);

        const requestBody = {
            input: { text: text.trim() },
            voice: voiceConfig,
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0  // 默认语速
            }
        };

        try {
            // 确保fetch已加载
            if (fetchModule) {
                await fetchModule;
            }
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.audioContent) {
                throw new Error('No audio content received from API');
            }

            // 将base64音频数据转换为Blob URL
            return this.base64ToAudioUrl(data.audioContent);

        } catch (error) {
            throw new Error(`TTS conversion failed: ${error.message}`);
        }
    }

    /**
     * 根据性别获取语音配置
     * @param {string} gender - 'male' 或 'female'
     * @returns {object} - 语音配置对象
     */
    getVoiceConfig(gender) {
        const voiceConfigs = {
            female: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-D',
                ssmlGender: 'FEMALE'
            },
            male: {
                languageCode: 'en-US',
                name: 'en-US-Wavenet-A',
                ssmlGender: 'MALE'
            }
        };

        return voiceConfigs[gender.toLowerCase()] || voiceConfigs.female;
    }

    /**
     * 将base64音频数据转换为Blob URL
     * @param {string} base64Audio - base64编码的音频数据
     * @returns {string} - Blob URL或Buffer（Node.js环境）
     */
    base64ToAudioUrl(base64Audio) {
        // Node.js环境
        if (typeof window === 'undefined') {
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            // 创建一个临时的data URL
            return `data:audio/mp3;base64,${base64Audio}`;
        }
        
        // 浏览器环境
        const audioBytes = atob(base64Audio);
        const audioArray = new Uint8Array(audioBytes.length);
        
        for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
        }
        
        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        return URL.createObjectURL(audioBlob);
    }

    /**
     * 清理音频URL资源
     * @param {string} audioUrl - 要清理的音频URL
     */
    static cleanupAudioUrl(audioUrl) {
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }
    }
}

// 使用示例：
/*
// 1. 创建TTS实例
const tts = new GoogleTTS('YOUR_API_KEY');

// 2. 转换文本为语音
try {
    const audioUrl = await tts.textToSpeech('Hello, how are you?', 'female');
    
    // 3. 播放音频
    const audio = new Audio(audioUrl);
    audio.play();
    
    // 4. 清理资源（可选，在不需要时调用）
    // GoogleTTS.cleanupAudioUrl(audioUrl);
} catch (error) {
    console.error('TTS Error:', error.message);
}
*/

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleTTS;
} else if (typeof window !== 'undefined') {
    window.GoogleTTS = GoogleTTS;
}

// ES模块导出
export default GoogleTTS;