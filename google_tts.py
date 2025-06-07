import os
import json
import base64
import requests
from typing import Optional

class GoogleTTS:
    """Google Cloud Text-to-Speech API 核心封装"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://texttospeech.googleapis.com/v1/text:synthesize'
    
    def text_to_speech(self, text: str, gender: str = 'female') -> str:
        """
        文本转语音
        
        Args:
            text: 要转换的文本
            gender: 语音性别 'male' 或 'female'
            
        Returns:
            返回base64编码的音频数据
            
        Raises:
            Exception: 当转换失败时抛出异常
        """
        if not text or not text.strip():
            raise Exception('Text cannot be empty')
        
        if not self.api_key:
            raise Exception('API key is required')
        
        # 根据性别选择语音
        voice_config = self._get_voice_config(gender)
        
        request_body = {
            'input': {'text': text.strip()},
            'voice': voice_config,
            'audioConfig': {
                'audioEncoding': 'MP3',
                'speakingRate': 1.0  # 默认语速
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}?key={self.api_key}",
                headers={'Content-Type': 'application/json'},
                json=request_body
            )
            
            if not response.ok:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', f'API Error: {response.status_code}')
                raise Exception(error_message)
            
            data = response.json()
            
            if 'audioContent' not in data:
                raise Exception('No audio content received from API')
            
            return data['audioContent']
            
        except requests.RequestException as e:
            raise Exception(f'TTS conversion failed: {str(e)}')
    
    def _get_voice_config(self, gender: str) -> dict:
        """
        根据性别获取语音配置
        
        Args:
            gender: 'male' 或 'female'
            
        Returns:
            语音配置字典
        """
        voice_configs = {
            'female': {
                'languageCode': 'en-US',
                'name': 'en-US-Wavenet-D',
                'ssmlGender': 'FEMALE'
            },
            'male': {
                'languageCode': 'en-US',
                'name': 'en-US-Wavenet-A',
                'ssmlGender': 'MALE'
            }
        }
        
        return voice_configs.get(gender.lower(), voice_configs['female'])