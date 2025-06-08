const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取音频文件时长（秒）
function getAudioDuration(audioPath) {
  try {
    // 使用ffprobe获取音频时长
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`;
    const result = execSync(command, { encoding: 'utf8' });
    return parseFloat(result.trim());
  } catch (error) {
    console.warn(`无法获取音频文件 ${audioPath} 的时长，使用默认时长3秒`);
    return 3.0; // 默认3秒
  }
}

// 从命令行参数获取索引
function getIndexFromArgs() {
  const args = process.argv.slice(2);
  const indexArg = args.find(arg => arg.startsWith('--index='));
  if (indexArg) {
    return parseInt(indexArg.split('=')[1]);
  }
  
  // 检查是否有 --index 后跟数字的格式
  const indexIndex = args.indexOf('--index');
  if (indexIndex !== -1 && args[indexIndex + 1]) {
    return parseInt(args[indexIndex + 1]);
  }
  
  return 1; // 默认第一行
}

(async () => {
  const lineIndex = getIndexFromArgs();
  console.log(`开始录制第 ${lineIndex} 行文字动画...`);
  
  // 获取对应音频文件的时长
  const audioPath = path.join(__dirname, 'audio', `audio${lineIndex}.mp3`);
  const audioDuration = getAudioDuration(audioPath);
  const animationDurationMs = Math.round(audioDuration * 1000); // 转换为毫秒
  
  console.log(`音频文件: ${audioPath}`);
  console.log(`音频时长: ${audioDuration} 秒`);
  console.log(`动画时长: ${animationDurationMs} 毫秒`);
  
  const browser = await puppeteer.launch({
    // headless: false, // 取消注释以在调试时查看浏览器窗口
    // slowMo: 50, // 减慢 Puppeteer 操作，便于观察
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  // 构建带参数的URL
  const htmlPath = path.join(__dirname, 'example2.html');
  const url = `file://${htmlPath}?index=${lineIndex}&duration=${animationDurationMs}`;
  
  await page.goto(url, {
    waitUntil: 'networkidle0' // 等待网络空闲，确保页面初始脚本执行完毕
  });

  const framesDir = `frames${lineIndex}`;
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  let frameCount = 0;
  const frameDelay = 50; // 20fps
  const maxRecordTime = animationDurationMs + 2000; // 动画时长 + 2秒缓冲
  let elapsedTime = 0;

  console.log('等待动画开始...');

  // 等待动画容器出现内容
  try {
    console.log('等待文字内容出现...');
    await page.waitForFunction((index) => {
      const lineElement = document.getElementById(`line${index}`);
      if (!lineElement) return false;
      const words = lineElement.querySelectorAll('.word');
      return words.length > 0;
    }, { timeout: 15000 }, lineIndex);
    console.log('检测到文字内容。');

    // 立即捕获一帧以确保动画的起始状态被录制
    const initialFrameFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    await page.screenshot({ path: initialFrameFilename, omitBackground: true });
    console.log(`已捕获初始帧: ${initialFrameFilename}`);
    frameCount++;

  } catch (e) {
    console.warn('超时或错误：等待文字内容出现时发生问题。将尝试继续录制。', e);
  }

  console.log('开始主循环逐帧捕获...');
  while (elapsedTime < maxRecordTime) {
    await new Promise(r => setTimeout(r, frameDelay));
    elapsedTime += frameDelay;

    if (elapsedTime >= maxRecordTime) {
      console.log('达到最大录制时长（在等待下一帧时）。');
      break;
    }

    const filename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    await page.screenshot({ path: filename, omitBackground: true });
    frameCount++;

    // 检查动画是否完成
    const animationComplete = await page.evaluate(() => {
      return document.body.getAttribute('data-animation-complete') === 'true';
    });

    if (animationComplete) {
      console.log('检测到动画完成信号。');
      // 动画完成后，再多录制几帧确保捕捉到最终状态
      console.log('额外录制最后几帧...');
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, frameDelay));
        elapsedTime += frameDelay;
        if (elapsedTime >= maxRecordTime && i > 0) {
          console.log('在额外录制期间达到最大时长。');
          break;
        }
        const finalFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
        await page.screenshot({ path: finalFilename, omitBackground: true });
        frameCount++;
      }
      break;
    }

    // 每5秒打印一次进度
    if (elapsedTime % 5000 < frameDelay && elapsedTime > 0) {
      if ((elapsedTime / frameDelay) % (Math.floor(5000 / frameDelay)) === 0) {
        console.log(`已录制 ${Math.round(elapsedTime / 1000)} 秒, ${frameCount} 帧...`);
      }
    }
  }

  if (elapsedTime >= maxRecordTime) {
    console.warn('达到最大录制时长，录制自动停止。');
  }

  console.log(`录制完成, 总共 ${frameCount} 帧保存在 ${framesDir} 目录下。`);
  await browser.close();
})();
