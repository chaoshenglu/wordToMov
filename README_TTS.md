# TTS文字动画项目使用说明

这个项目扩展了原有的文字动画功能，添加了TTS（文本转语音）和卡拉OK样式的动画效果。

## 功能特性

1. **TTS语音合成**：将英文句子转换为语音
2. **卡拉OK动画**：文字逐字高亮显示，配合语音播放
3. **视频导出**：支持导出为PNG序列和MOV视频格式
4. **音频同步**：视频包含同步的语音音轨

## 文件说明

- `example2.html` - 新的TTS动画页面
- `capture2.js` - 录制TTS动画的脚本
- `generate-audio.js` - 音频生成脚本
- `tts-core-js.js` - Google TTS API封装

## 使用步骤

### 第一步：配置Google TTS API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用 Text-to-Speech API
3. 创建API Key
4. 在 `example2.html` 中找到这一行：
   ```javascript
   const API_KEY = 'YOUR_GOOGLE_TTS_API_KEY';
   ```
5. 将 `YOUR_GOOGLE_TTS_API_KEY` 替换为你的实际API Key

### 第二步：导出PNG序列

```bash
npm run export:png2
```

这个命令会：
- 启动Puppeteer浏览器
- 加载 example2.html
- 等待TTS音频生成
- 录制卡拉OK动画
- 保存PNG帧到 `frames/` 目录

### 第三步：导出MOV视频

```bash
npm run export:mov2
```

这个命令会：
- 生成音频文件（如果没有配置API Key，会生成静音音频）
- 使用ffmpeg将PNG序列和音频合成为MOV视频
- 输出文件：`output2.mov`
- 清理临时文件

## 动画内容

当前配置的英文句子：

1. "She wore a thermal sweater to stay warm in the freezing weather."
2. "He filled his thermos with hot coffee before going hiking."
3. "Ice melting is an endothermic process because it absorbs heat from the surroundings."
4. "Burning wood is an exothermic reaction because it releases heat."
5. "The doctor used a thermometer to check if the child had a fever."

## 自定义内容

要修改动画内容，请编辑 `example2.html` 中的 `en_list` 数组：

```javascript
let en_list = [
  "你的第一个句子",
  "你的第二个句子",
  // 添加更多句子...
];
```

同时也要更新 `generate-audio.js` 中的相同数组。

## 故障排除

### TTS API错误
- 确保API Key正确配置
- 检查Google Cloud项目是否启用了Text-to-Speech API
- 确保API Key有足够的配额

### 录制问题
- 如果录制超时，可以增加 `capture2.js` 中的 `maxRecordTime`
- 如果动画不开始，检查浏览器控制台的错误信息

### 音频问题
- 如果没有配置API Key，系统会生成静音音频作为占位符
- 确保系统安装了ffmpeg

## 技术细节

- **帧率**：20fps (50ms间隔)
- **分辨率**：1080x1920 (竖屏)
- **视频编码**：ProRes 4444 (支持透明度)
- **音频编码**：AAC
- **TTS语音**：Google Cloud Text-to-Speech (英文女声)

## 依赖要求

- Node.js
- Puppeteer
- FFmpeg
- Google Cloud Text-to-Speech API Key (可选，用于真实语音)