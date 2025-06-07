const fs = require('fs');
const path = require('path');

// 模拟TTS音频生成脚本
// 由于实际的TTS需要API Key，这里创建一个备用方案

const en_list = [
  "She wore a thermal sweater to stay warm in the freezing weather.",
  "He filled his thermos with hot coffee before going hiking.",
  "Ice melting is an endothermic process because it absorbs heat from the surroundings.",
  "Burning wood is an exothermic reaction because it releases heat.",
  "The doctor used a thermometer to check if the child had a fever."
];

// 创建音频目录
const audioDir = 'audio';
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir);
}

// 生成静音音频文件作为占位符
// 实际使用时，用户需要配置Google TTS API Key
function generateSilentAudio(duration, filename) {
  // 使用ffmpeg生成静音音频
  const { execSync } = require('child_process');
  try {
    execSync(`ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${duration} -c:a mp3 "${filename}" -y`, { stdio: 'inherit' });
    console.log(`生成静音音频: ${filename} (${duration}秒)`);
  } catch (error) {
    console.error(`生成音频失败: ${filename}`, error.message);
  }
}

// 为每个句子生成音频文件
en_list.forEach((sentence, index) => {
  const filename = path.join(audioDir, `sentence_${index + 1}.mp3`);
  // 根据句子长度估算音频时长（大约每个字符0.1秒）
  const estimatedDuration = Math.max(3, sentence.length * 0.1);
  generateSilentAudio(estimatedDuration, filename);
});

// 合并所有音频文件
const { execSync } = require('child_process');
try {
  // 创建ffmpeg输入文件列表
  const inputList = en_list.map((_, index) => {
    return `file 'sentence_${index + 1}.mp3'`;
  }).join('\n');
  
  fs.writeFileSync(path.join(audioDir, 'input_list.txt'), inputList);
  
  // 合并音频文件
  execSync(`cd audio && ffmpeg -f concat -safe 0 -i input_list.txt -c copy combined_audio.mp3 -y`, { stdio: 'inherit' });
  console.log('音频合并完成: audio/combined_audio.mp3');
  
  // 清理临时文件
  fs.unlinkSync(path.join(audioDir, 'input_list.txt'));
  en_list.forEach((_, index) => {
    const filename = path.join(audioDir, `sentence_${index + 1}.mp3`);
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
  });
  
} catch (error) {
  console.error('音频合并失败:', error.message);
}

console.log('\n=== 音频生成完成 ===');
console.log('注意：当前生成的是静音音频文件作为占位符。');
console.log('要使用真实的TTS音频，请：');
console.log('1. 获取Google Cloud Text-to-Speech API Key');
console.log('2. 在 example2.html 中替换 YOUR_GOOGLE_TTS_API_KEY');
console.log('3. 重新运行 npm run export:png2');
console.log('4. 然后运行 npm run export:mov2');