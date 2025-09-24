// Global variables
let apps = [];

// Check authentication
function checkAuth() {
    fetch('/api/apps')
        .then(response => {
            if (response.status === 401) {
                showLoginModal();
            }
        })
        .catch(error => {
            console.error('Error checking auth:', error);
            showLoginModal();
        });
}

// Show login modal
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

// Hide login modal
function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Login function
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `password=${encodeURIComponent(password)}`
    })
    .then(response => {
        if (response.ok) {
            hideLoginModal();
            loadDashboard();
        } else {
            alert('Password salah!');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Error saat login');
    });
});

// Logout function
function logout() {
    fetch('/logout')
        .then(() => {
            window.location.reload();
        });
}

// Show section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked menu item
    event.target.classList.add('active');
    
    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'manage-apps':
            loadApps();
            break;
        case 'notification':
            loadNotificationTemplate();
            break;
    }
}

// Load dashboard data
function loadDashboard() {
    fetch('/api/apps')
        .then(response => response.json())
        .then(data => {
            apps = data;
            
            // Update stats
            document.getElementById('total-apps').textContent = data.length;
            document.getElementById('active-apps').textContent = data.filter(app => app.status === 'active').length;
            document.getElementById('notified-apps').textContent = data.filter(app => app.status === 'notified').length;
            
            // Update activity list
            updateActivityList(data);
        })
        .catch(error => {
            console.error('Error loading dashboard:', error);
        });
}

// Update activity list
function updateActivityList(apps) {
    const activityList = document.getElementById('activity-list');
    const recentApps = apps.slice(-5).reverse();
    
    activityList.innerHTML = recentApps.map(app => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${app.platform === 'android' ? 'robot' : 'apple'}"></i>
            </div>
            <div class="activity-info">
                <strong>${app.channel_id}</strong>
                <span>${app.app_name || 'N/A'}</span>
            </div>
            <div class="activity-status ${app.status}">
                ${app.status === 'active' ? 'Aktif' : 'Notified'}
            </div>
        </div>
    `).join('');
}

// Add apps in batch
function addApps() {
    const batchInput = document.getElementById('batch-input').value;
    const lines = batchInput.split('\n').filter(line => line.trim());
    
    const appsData = lines.map(line => {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            return {
                channel_id: parts[0],
                store_url: parts[1],
                app_name: parts.slice(2).join(' ') || ''
            };
        }
        return null;
    }).filter(app => app !== null);
    
    if (appsData.length === 0) {
        alert('Format input tidak valid!');
        return;
    }
    
    fetch('/api/apps', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apps: appsData })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.errors && data.errors.length > 0) {
            alert('Errors: ' + data.errors.join(', '));
        }
        document.getElementById('batch-input').value = '';
        loadDashboard();
    })
    .catch(error => {
        console.error('Error adding apps:', error);
        alert('Error saat menambahkan aplikasi');
    });
}

// Add single app
function addSingleApp() {
    const channelId = document.getElementById('single-channel-id').value;
    const appUrl = document.getElementById('single-app-url').value;
    
    if (!channelId || !appUrl) {
        alert('Harap isi semua field!');
        return;
    }
    
    const appsData = [{
        channel_id: channelId,
        store_url: appUrl,
        app_name: ''
    }];
    
    fetch('/api/apps', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apps: appsData })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        document.getElementById('single-channel-id').value = '';
        document.getElementById('single-app-url').value = '';
        loadDashboard();
    })
    .catch(error => {
        console.error('Error adding app:', error);
        alert('Error saat menambahkan aplikasi');
    });
}

// Load apps for management
function loadApps() {
    fetch('/api/apps')
        .then(response => response.json())
        .then(data => {
            apps = data;
            renderAppsTable(data);
        })
        .catch(error => {
            console.error('Error loading apps:', error);
        });
}

// Render apps table
function renderAppsTable(apps) {
    const tbody = document.getElementById('apps-table-body');
    
    tbody.innerHTML = apps.map(app => `
        <tr>
            <td><input type="checkbox" class="app-checkbox" value="${app.channel_id}"></td>
            <td>${app.channel_id}</td>
            <td>${app.app_name || 'N/A'}</td>
            <td>
                <span class="platform-badge ${app.platform}">
                    <i class="fas fa-${app.platform === 'android' ? 'robot' : 'apple'}"></i>
                    ${app.platform.toUpperCase()}
                </span>
            </td>
            <td>
                <span class="status-badge ${app.status}">
                    ${app.status === 'active' ? 'Aktif' : 'Notified'}
                </span>
            </td>
            <td>
                <button class="btn-small btn-danger" onclick="deleteApp('${app.channel_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Delete selected apps
function deleteSelected() {
    const selectedCheckboxes = document.querySelectorAll('.app-checkbox:checked');
    const channelIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (channelIds.length === 0) {
        alert('Pilih aplikasi yang ingin dihapus!');
        return;
    }
    
    if (!confirm(`Yakin ingin menghapus ${channelIds.length} aplikasi?`)) {
        return;
    }
    
    fetch('/api/apps', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_ids: channelIds })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadApps();
        loadDashboard();
    })
    .catch(error => {
        console.error('Error deleting apps:', error);
        alert('Error saat menghapus aplikasi');
    });
}

// Delete single app
function deleteApp(channelId) {
    if (!confirm('Yakin ingin menghapus aplikasi ini?')) {
        return;
    }
    
    fetch('/api/apps', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_ids: [channelId] })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadApps();
        loadDashboard();
    })
    .catch(error => {
        console.error('Error deleting app:', error);
        alert('Error saat menghapus aplikasi');
    });
}

// Load notification template
function loadNotificationTemplate() {
    // In a real implementation, this would fetch from the server
    const template = `包链接：{store_url}\n渠道号: {channel_id}\n状态: 无法打开，包已掉线，请立即关闭广告！`;
    document.getElementById('notification-template').value = template;
    updateNotificationPreview();
}

// Update notification template
function updateNotificationTemplate() {
    const template = document.getElementById('notification-template').value;
    
    fetch('/api/notification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_text: template })
    })
    .then(response => response.json())
    .then(data => {
        alert('Template notifikasi berhasil diperbarui!');
        updateNotificationPreview();
    })
    .catch(error => {
        console.error('Error updating template:', error);
        alert('Error saat memperbarui template');
    });
}

// Update notification preview
function updateNotificationPreview() {
    const template = document.getElementById('notification-template').value;
    const preview = template
        .replace('{store_url}', 'https://play.google.com/store/apps/details?id=com.example')
        .replace('{channel_id}', 'C-87935')
        .replace('{app_name}', 'Contoh Aplikasi');
    
    document.getElementById('notification-preview').textContent = preview;
}

// Select all checkbox
document.getElementById('select-all').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.app-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = this.checked;
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard();
    
    // Add event listener for template preview
    document.getElementById('notification-template').addEventListener('input', updateNotificationPreview);
});
