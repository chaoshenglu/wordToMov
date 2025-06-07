import os
import base64
from google_tts import GoogleTTS

# 英文句子列表
en_list = [
    "She wore a thermal sweater to stay warm in the freezing weather.",
    "He filled his thermos with hot coffee before going hiking.",
    "Ice melting is an endothermic process because it absorbs heat from the surroundings.",
    "Burning wood is an exothermic reaction because it releases heat.",
    "The doctor used a thermometer to check if the child had a fever."
]

def generate_audio_files():
    """生成音频文件的主函数"""
    # 从环境变量获取API Key
    api_key = os.getenv('GOOGLE_TTS_API_KEY')
    
    if not api_key:
        print('请设置环境变量 GOOGLE_TTS_API_KEY')
        return
    
    # 获取当前脚本所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    audio_dir = os.path.join(current_dir, 'audio')
    
    # 确保audio文件夹存在
    if not os.path.exists(audio_dir):
        os.makedirs(audio_dir)
    
    # 创建TTS实例
    tts = GoogleTTS(api_key)
    
    print('开始生成音频文件...')
    
    for i, text in enumerate(en_list):
        audio_filename = f'audio{i + 1}.mp3'
        audio_filepath = os.path.join(audio_dir, audio_filename)
        
        try:
            print(f'正在生成 {audio_filename}: "{text}"')
            
            # 调用TTS API获取base64音频数据
            base64_audio = tts.text_to_speech(text, 'female')
            
            # 将base64数据解码为二进制数据
            audio_data = base64.b64decode(base64_audio)
            
            # 保存音频文件
            with open(audio_filepath, 'wb') as f:
                f.write(audio_data)
            
            print(f'✓ {audio_filename} 生成成功')
            
        except Exception as error:
            print(f'✗ 生成 {audio_filename} 失败: {str(error)}')
    
    print('音频文件生成完成！')

if __name__ == '__main__':
    generate_audio_files()