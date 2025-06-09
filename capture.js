const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path'); // path模块用于处理文件路径

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  await page.goto(`file://${path.join(__dirname, 'example.html')}`, {
    waitUntil: 'networkidle0' // 等待网络空闲，确保页面初始脚本执行完毕
  });

  const framesDir = 'frames';
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  let frameCount = 0;
  const frameDelay = 20;
  const maxRecordTime = 60000; // 最大录制时长 60 秒，防止无限循环
  let elapsedTime = 0;

  console.log('开始录制动画...');

  // 等待动画容器出现内容，表示动画已开始或即将开始
  try {
    console.log('等待首行文字出现...');
    await page.waitForFunction(() => {
      const container = document.getElementById('text-container');
      if (!container) return false;
      const firstP = container.querySelector('p');
      // 确保第一个p元素存在，并且其textContent不为空白
      return firstP && firstP.textContent.trim().length > 0;
    }, { timeout: 15000 }); // 等待最多15秒，因为动画本身可能较慢
    console.log('检测到首行文字内容。');

    // 立即捕获一帧以确保首行动画的起始状态被录制
    const initialFrameFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    await page.screenshot({ path: initialFrameFilename, omitBackground: true });
    console.log(`已捕获初始帧: ${initialFrameFilename}`);
    frameCount++;
    // elapsedTime += frameDelay; // 这次截图不计入主循环的 elapsedTime，或者单独处理计时逻辑
    // 为了简化，暂时不增加 elapsedTime，让主循环的第一个 delay 生效

  } catch (e) {
    console.warn('超时或错误：等待首行文字出现时发生问题。将尝试继续录制。', e);
    // 如果这里出错，可能意味着页面没有按预期加载，后续录制可能也是空的
  }

  console.log('开始主循环逐帧捕获...');
  while (elapsedTime < maxRecordTime) {
    // 每一帧（从第二帧开始，即 frame_0001.png）之前都等待 frameDelay
    // 初始帧 (frame_0000.png) 已在循环外捕获，frameCount 进入循环时为 1

    await new Promise(r => setTimeout(r, frameDelay));
    elapsedTime += frameDelay;

    // 如果等待后超时，则跳出循环，不再截图
    if (elapsedTime >= maxRecordTime) {
      console.log('达到最大录制时长（在等待下一帧时）。');
      break;
    }

    const filename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    await page.screenshot({ path: filename, omitBackground: true });
    // console.log(`已捕获: ${filename}`); // 可以取消注释以进行详细调试
    frameCount++;

    // 检查动画是否完成
    const animationComplete = await page.evaluate(() => {
      return document.body.getAttribute('data-animation-complete') === 'true';
    });

    if (animationComplete) {
      console.log('检测到动画完成信号。');
      // 动画完成后，再多录制几帧确保捕捉到最终状态
      // 当前帧已截图，所以从下一帧开始额外录制
      console.log('额外录制最后几帧...');
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, frameDelay)); // 等待
        elapsedTime += frameDelay; // 也要计时
        if (elapsedTime >= maxRecordTime && i > 0) { // 如果在额外录制时超时，至少保证当前帧录完
          console.log('在额外录制期间达到最大时长。');
          break;
        }
        const finalFilename = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
        await page.screenshot({ path: finalFilename, omitBackground: true });
        // console.log(`已捕获额外帧: ${finalFilename}`);
        frameCount++;
      }
      break;
    }

    // 循环末尾不需要额外的 delay，因为下一次迭代开始时会等待
    // 之前的 elapsedTime += frameDelay 和 setTimeout(r, frameDelay) 在循环末尾是多余的

    if (elapsedTime % 5000 < frameDelay && elapsedTime > 0) { // 每5秒打印一次进度 (近似)
      // 避免在每次迭代都打印，只在接近5秒的倍数时打印
      // 例如 frameDelay=20, 5000/20 = 250. 当 elapsedTime 是 5000, 10000...
      // (elapsedTime / frameDelay) % (5000 / frameDelay) == 0
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
