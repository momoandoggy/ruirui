from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
import os
from monitoring import MonitoringSystem
from telegram_bot import TelegramBot
import threading
import time

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
app.config['PASSWORD'] = 'xiaogui'

# Inisialisasi sistem
monitoring_system = MonitoringSystem()
telegram_bot = TelegramBot()

# Database setup
def init_db():
    conn = sqlite3.connect('apps.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS apps
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  channel_id TEXT UNIQUE,
                  app_name TEXT,
                  store_url TEXT,
                  platform TEXT,
                  status TEXT DEFAULT 'active',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    if 'logged_in' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == app.config['PASSWORD']:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Password salah!')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/api/apps', methods=['GET', 'POST', 'DELETE'])
def manage_apps():
    if 'logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = sqlite3.connect('apps.db')
    c = conn.cursor()
    
    if request.method == 'GET':
        c.execute("SELECT * FROM apps WHERE status='active'")
        apps = c.fetchall()
        result = []
        for app in apps:
            result.append({
                'id': app[0],
                'channel_id': app[1],
                'app_name': app[2],
                'store_url': app[3],
                'platform': app[4],
                'status': app[5]
            })
        return jsonify(result)
    
    elif request.method == 'POST':
        data = request.get_json()
        apps_data = data.get('apps', [])
        
        added_count = 0
        errors = []
        
        for app_data in apps_data:
            try:
                channel_id = app_data.get('channel_id')
                store_url = app_data.get('store_url')
                app_name = app_data.get('app_name', '')
                
                # Determine platform
                if 'play.google.com' in store_url:
                    platform = 'android'
                elif 'apps.apple.com' in store_url:
                    platform = 'ios'
                else:
                    errors.append(f"URL tidak valid: {store_url}")
                    continue
                
                c.execute("INSERT OR IGNORE INTO apps (channel_id, app_name, store_url, platform) VALUES (?, ?, ?, ?)",
                         (channel_id, app_name, store_url, platform))
                added_count += 1
                
            except Exception as e:
                errors.append(str(e))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Berhasil menambahkan {added_count} aplikasi',
            'errors': errors
        })
    
    elif request.method == 'DELETE':
        data = request.get_json()
        channel_ids = data.get('channel_ids', [])
        
        deleted_count = 0
        for channel_id in channel_ids:
            c.execute("UPDATE apps SET status='deleted' WHERE channel_id=?", (channel_id,))
            if c.rowcount > 0:
                deleted_count += 1
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Berhasil menghapus {deleted_count} aplikasi'})

@app.route('/api/notification', methods=['POST'])
def update_notification():
    if 'logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    notification_text = data.get('notification_text', '')
    
    # Save notification template to file or database
    with open('notification_template.txt', 'w', encoding='utf-8') as f:
        f.write(notification_text)
    
    return jsonify({'message': 'Template notifikasi berhasil diperbarui'})

def start_monitoring():
    time.sleep(5)  # Wait for Flask to start
    monitoring_system.start()

if __name__ == '__main__':
    # Start monitoring in separate thread
    monitor_thread = threading.Thread(target=start_monitoring)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
