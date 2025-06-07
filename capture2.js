const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path'); // path模块用于处理文件路径

(async () => {
  const browser = await puppeteer.launch({
    // headless: false, // 取消注释以在调试时查看浏览器窗口
    // slowMo: 50, // 减慢 Puppeteer 操作，便于观察
    args: ['--autoplay-policy=no-user-gesture-required'] // 允许自动播放音频
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  // 允许音频播放
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: () => Promise.resolve({})
      }
    });
  });

  await page.goto(`file://${path.join(__dirname, 'example2.html')}`, {
    waitUntil: 'networkidle0' // 等待网络空闲，确保页面初始脚本执行完毕
  });

  const framesDir = 'frames';
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  let frameCount = 0;
  const frameDelay = 50; // 20fps
  const maxRecordTime = 120000; // 最大录制时长 120 秒，因为TTS和动画可能较长
  let elapsedTime = 0;

  console.log('开始录制TTS动画...');

  // 等待动画容器出现内容，表示动画已开始或即将开始
  try {
    console.log('等待首个句子出现...');
    await page.waitForFunction(() => {
      const container = document.getElementById('text-container');
      if (!container) return false;
      const firstSentence = container.querySelector('.sentence');
      // 确保第一个句子元素存在，并且其内容不为空
      return firstSentence && firstSentence.textContent.trim().length > 0;
    }, { timeout: 30000 }); // 等待最多30秒，因为TTS转换可能需要时间
    console.log('检测到首个句子内容。');

    // 立即捕获一帧以确保首句动画的起始状态被录制
    const initialFrameFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    await page.screenshot({ path: initialFrameFilename, omitBackground: true });
    console.log(`已捕获初始帧: ${initialFrameFilename}`);
    frameCount++;

  } catch (e) {
    console.warn('超时或错误：等待首个句子出现时发生问题。将尝试继续录制。', e);
    // 如果这里出错，可能意味着页面没有按预期加载，后续录制可能也是空的
  }

  console.log('开始主循环逐帧捕获...');
  while (elapsedTime < maxRecordTime) {
    // 每一帧之前都等待 frameDelay
    await new Promise(r => setTimeout(r, frameDelay));
    elapsedTime += frameDelay;

    // 如果等待后超时，则跳出循环，不再截图
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
        await new Promise(r => setTimeout(r, frameDelay)); // 等待
        elapsedTime += frameDelay; // 也要计时
        if (elapsedTime >= maxRecordTime && i > 0) { // 如果在额外录制时超时，至少保证当前帧录完
          console.log('在额外录制期间达到最大时长。');
          break;
        }
        const finalFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
        await page.screenshot({ path: finalFilename, omitBackground: true });
        frameCount++;
      }
      break;
    }

    if (elapsedTime % 5000 < frameDelay && elapsedTime > 0) { // 每5秒打印一次进度 (近似)
      if ((elapsedTime / frameDelay) % (Math.floor(5000 / frameDelay)) === 0) {
        console.log(`已录制 ${Math.round(elapsedTime / 1000)} 秒, ${frameCount} 帧...`);
      }
    }
  }

  if (elapsedTime >= maxRecordTime) {
    console.warn('达到最大录制时长，录制自动停止。');
  }

  console.log(`录制完成, 总共 ${frameCount} 帧保存在 ${framesDir} 目录下。`);
  
  // 尝试提取音频信息（如果页面有生成音频的话）
  try {
    const audioInfo = await page.evaluate(() => {
      // 检查是否有音频元素或音频URL
      const audioElements = document.querySelectorAll('audio');
      const audioUrls = [];
      
      audioElements.forEach(audio => {
        if (audio.src && audio.src.startsWith('blob:')) {
          audioUrls.push(audio.src);
        }
      });
      
      return {
        hasAudio: audioUrls.length > 0,
        audioCount: audioUrls.length,
        audioUrls: audioUrls
      };
    });
    
    if (audioInfo.hasAudio) {
      console.log(`检测到 ${audioInfo.audioCount} 个音频元素`);
      console.log('注意：音频合成需要在 export:mov2 命令中处理');
    } else {
      console.log('未检测到音频元素，可能TTS功能需要API Key配置');
    }
  } catch (e) {
    console.warn('音频信息提取失败:', e);
  }
  
  await browser.close();
})();
