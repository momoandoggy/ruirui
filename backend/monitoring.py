import requests
from bs4 import BeautifulSoup
import sqlite3
import time
from apscheduler.schedulers.background import BackgroundScheduler
from telegram_bot import TelegramBot
import re

class MonitoringSystem:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.bot = TelegramBot()
        self.checked_apps = set()
    
    def check_app_status(self, app_id, channel_id, app_name, store_url, platform):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(store_url, headers=headers, timeout=10)
            
            if platform == 'android':
                # Check for Play Store removal indicators
                if response.status_code == 404 or "We're sorry, the requested URL was not found" in response.text:
                    return False
                soup = BeautifulSoup(response.content, 'html.parser')
                error_element = soup.find('div', class_='error-page')
                if error_element:
                    return False
            
            elif platform == 'ios':
                # Check for App Store removal indicators
                if response.status_code == 404 or "This app is not available in your country" in response.text:
                    return False
                if "The item you've requested is not currently available" in response.text:
                    return False
            
            return True
            
        except requests.RequestException:
            return False
    
    def monitor_apps(self):
        conn = sqlite3.connect('apps.db')
        c = conn.cursor()
        c.execute("SELECT * FROM apps WHERE status='active'")
        apps = c.fetchall()
        
        for app in apps:
            app_id, channel_id, app_name, store_url, platform, status, created_at = app
            
            # Skip if already notified
            if app_id in self.checked_apps:
                continue
            
            is_active = self.check_app_status(app_id, channel_id, app_name, store_url, platform)
            
            if not is_active:
                # App is removed from store
                self.send_notification(channel_id, app_name, store_url)
                self.checked_apps.add(app_id)
                
                # Mark as notified in database
                c.execute("UPDATE apps SET status='notified' WHERE id=?", (app_id,))
                conn.commit()
        
        conn.close()
    
    def send_notification(self, channel_id, app_name, store_url):
        # Load notification template
        try:
            with open('notification_template.txt', 'r', encoding='utf-8') as f:
                template = f.read()
        except:
            template = "包链接：{store_url}\n渠道号: {channel_id}\n状态: 无法打开，包已掉线，请立即关闭广告！"
        
        message = template.format(
            store_url=store_url,
            channel_id=channel_id,
            app_name=app_name
        )
        
        self.bot.send_message(message)
    
    def start(self):
        # Schedule monitoring every 30 seconds
        self.scheduler.add_job(self.monitor_apps, 'interval', seconds=30)
        self.scheduler.start()
    
    def stop(self):
        self.scheduler.shutdown()
