// uiHelpers.js - UI相关辅助函数
export function updateUIElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element with id '${elementId}' not found`);
        return;
    }
    element.textContent = value;
}

export function showErrorToUser(error) {
    const errorMessage = getUserFriendlyErrorMessage(error);
    console.error('Error:', error);
    
    // 显示错误提示
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = errorMessage;
        errorContainer.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 3000);
    } else {
        alert(errorMessage);
    }
}

export function getUserFriendlyErrorMessage(error) {
    if (typeof error === 'string') {
        return error;
    }

    // 处理常见的蓝牙错误
    if (error.name === 'NotFoundError') {
        return '未找到蓝牙设备，请确保设备已开启并在范围内';
    }
    if (error.name === 'SecurityError') {
        return '无法访问蓝牙设备，请确保浏览器有权限访问蓝牙';
    }
    if (error.name === 'NetworkError') {
        return '连接蓝牙设备失败，请重试';
    }
    if (error.name === 'NotSupportedError') {
        return '您的设备不支持蓝牙功能或Web Bluetooth API';
    }
    if (error.name === 'InvalidStateError') {
        return '蓝牙适配器未就绪，请确保蓝牙已开启';
    }

    // 处理其他错误
    return error.message || '发生未知错误，请重试';
}

export function updateConnectionStatus(status, deviceName = '') {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        console.warn('Connection status element not found');
        return;
    }

    let statusText = '';
    let statusClass = '';

    switch (status) {
        case 'connecting':
            statusText = '正在连接...';
            statusClass = 'status-connecting';
            break;
        case 'connected':
            statusText = `已连接到 ${deviceName}`;
            statusClass = 'status-connected';
            break;
        case 'disconnected':
            statusText = '已断开连接';
            statusClass = 'status-disconnected';
            break;
        case 'error':
            statusText = '连接错误';
            statusClass = 'status-error';
            break;
        default:
            statusText = '未连接';
            statusClass = 'status-disconnected';
    }

    statusElement.textContent = statusText;
    statusElement.className = `connection-status ${statusClass}`;
}

export function updateSensorData(data) {
    if (!data) return;

    // 更新加速度计数据
    if (data.accelerometer) {
        updateUIElement('acc-x', data.accelerometer.x.toFixed(2));
        updateUIElement('acc-y', data.accelerometer.y.toFixed(2));
        updateUIElement('acc-z', data.accelerometer.z.toFixed(2));
    }

    // 更新陀螺仪数据
    if (data.gyroscope) {
        updateUIElement('gyro-x', data.gyroscope.x.toFixed(2));
        updateUIElement('gyro-y', data.gyroscope.y.toFixed(2));
        updateUIElement('gyro-z', data.gyroscope.z.toFixed(2));
    }

    // 更新欧拉角
    if (data.euler) {
        updateUIElement('euler-roll', (data.euler.roll * 180 / Math.PI).toFixed(1));
        updateUIElement('euler-pitch', (data.euler.pitch * 180 / Math.PI).toFixed(1));
        updateUIElement('euler-yaw', (data.euler.yaw * 180 / Math.PI).toFixed(1));
    }
}

export function showDisconnectNotification(deviceName = '未知设备') {
    // 尝试使用系统通知
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('设备断开连接', {
            body: `${deviceName} 已断开连接`
        });
        return;
    }

    // 如果没有系统通知权限，使用自定义UI通知
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
        const notification = document.createElement('div');
        notification.className = 'disconnect-notification';
        notification.textContent = `${deviceName} 已断开连接`;
        
        notificationContainer.appendChild(notification);
        
        // 3秒后自动移除通知
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 500); // 等待淡出动画完成
        }, 3000);
    } else {
        // 如果没有通知容器，回退到alert
        alert(`设备已断开连接: ${deviceName}`);
    }

    // 更新连接状态
    updateConnectionStatus('disconnected');
}
