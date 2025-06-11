import os
import base64
import re
from google_tts import GoogleTTS

def get_en_list_from_js(js_file_path):
    """从JavaScript文件中提取英文句子列表"""
    try:
        import json
        import re
        
        # 读取JavaScript文件内容
        with open(js_file_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # 使用正则表达式提取JSON部分
        # 匹配 const wordsData = { ... }; 中的JSON部分
        pattern = r'const\s+wordsData\s*=\s*({.*?});'
        match = re.search(pattern, js_content, re.DOTALL)
        
        if match:
            json_str = match.group(1)
            # 解析JSON
            data = json.loads(json_str)
            
            # 从words数组中提取sentence字段
            if 'words' in data and isinstance(data['words'], list):
                en_list = [word['sentence'] for word in data['words'] if 'sentence' in word]
                return en_list
            else:
                print('在JavaScript文件中未找到words数组')
                return []
        else:
            print('无法从JavaScript文件中提取JSON数据')
            return []
            
    except Exception as e:
        print(f'读取JavaScript文件失败: {str(e)}')
        return []

# 从JavaScript文件获取英文句子列表
current_dir = os.path.dirname(os.path.abspath(__file__))
js_file_path = os.path.join(current_dir, 'words.js')
en_list = get_en_list_from_js(js_file_path)

def generate_audio_files():
    """生成音频文件的主函数"""
    # 检查是否成功获取到英文句子列表
    if not en_list:
        print('未能从JavaScript文件中获取到英文句子列表，程序退出')
        return
    
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