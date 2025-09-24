import requests
import json

class TelegramBot:
    def __init__(self):
        self.token = "8320390995:AAEKPMgVyRlk7AQ9aGrgA7hmMMKKFb0kbYw"
        self.chat_id = "-1001234567890"  # Ganti dengan chat ID grup/channel Anda
    
    def send_message(self, message):
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload = {
            'chat_id': self.chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        try:
            response = requests.post(url, json=payload)
            return response.json()
        except Exception as e:
            print(f"Error sending message: {e}")
            return None
