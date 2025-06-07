import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import GoogleTTS from './tts-core-js.js';

// 获取当前文件的目录路径（ES模块中的__dirname替代方案）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let en_list = [
    "She wore a thermal sweater to stay warm in the freezing weather.",
    "He filled his thermos with hot coffee before going hiking.",
    "Ice melting is an endothermic process because it absorbs heat from the surroundings.",
    "Burning wood is an exothermic reaction because it releases heat.",
    "The doctor used a thermometer to check if the child had a fever."
];

// 确保audio文件夹存在
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

// 生成音频文件的主函数
async function generateAudioFiles() {
    // 从环境变量获取API Key
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    
    if (!apiKey) {
        console.error('请设置环境变量 GOOGLE_TTS_API_KEY');
        process.exit(1);
    }
    
    const tts = new GoogleTTS(apiKey);
    
    console.log('开始生成音频文件...');
    
    for (let i = 0; i < en_list.length; i++) {
        const text = en_list[i];
        const audioFileName = `audio${i + 1}.mp3`;
        const audioFilePath = path.join(audioDir, audioFileName);
        
        try {
            console.log(`正在生成 ${audioFileName}: "${text}"`);
            
            // 调用TTS API
            const audioUrl = await tts.textToSpeech(text, 'female');
            
            // 从data URL获取音频数据
            let audioBuffer;
            if (audioUrl.startsWith('data:audio/mp3;base64,')) {
                // 直接从base64数据创建buffer
                const base64Data = audioUrl.replace('data:audio/mp3;base64,', '');
                audioBuffer = Buffer.from(base64Data, 'base64');
            } else {
                // 如果是其他格式的URL，通过fetch获取
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = Buffer.from(arrayBuffer);
            }
            
            // 保存音频文件
            fs.writeFileSync(audioFilePath, audioBuffer);
            
            console.log(`✓ ${audioFileName} 生成成功`);
            
            // 清理Blob URL
            GoogleTTS.cleanupAudioUrl(audioUrl);
            
        } catch (error) {
            console.error(`✗ 生成 ${audioFileName} 失败:`, error.message);
        }
    }
    
    console.log('音频文件生成完成！');
}

// 运行生成函数
generateAudioFiles().catch(console.error);