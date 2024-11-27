// bluetoothHelpers.js - 蓝牙连接辅助函数
import { DEVICE_CONFIG } from './config.js';
import { 
    showErrorToUser, 
    updateConnectionStatus,
    showDisconnectNotification 
} from './uiHelpers.js';

export function cleanupConnection(state) {
    if (state.characteristic) {
        try {
            state.characteristic.removeEventListener('characteristicvaluechanged',
                state.characteristicHandler);
        } catch (error) {
            console.warn('Error removing characteristic event listener:', error);
        }
        state.characteristic = null;
        state.characteristicHandler = null;
    }

    if (state.device) {
        try {
            state.device.removeEventListener('gattserverdisconnected',
                state.disconnectedHandler);
        } catch (error) {
            console.warn('Error removing device event listener:', error);
        }
        state.device = null;
        state.disconnectedHandler = null;
    }

    if (state.server) {
        try {
            state.server.disconnect();
        } catch (error) {
            console.warn('Error disconnecting server:', error);
        }
        state.server = null;
    }

    state.service = null;
    updateConnectionStatus('disconnected');
}

export async function readCharacteristicValue(characteristic) {
    try {
        const value = await characteristic.readValue();
        if (!value) {
            throw new Error('Failed to read characteristic value');
        }
        return value;
    } catch (error) {
        console.error('Error reading characteristic:', error);
        throw error;
    }
}

export function convertSystemIDToString(dataView) {
    if (!(dataView instanceof DataView)) {
        throw new Error('Input must be a DataView');
    }

    const length = dataView.byteLength;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = dataView.getUint8(i);
    }

    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(':');
}

export function setupDataHandler(characteristic, callback) {
    if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
    }

    return async function handleCharacteristicValueChanged(event) {
        try {
            const value = event.target.value;
            if (!(value instanceof DataView)) {
                throw new Error('Characteristic value must be a DataView');
            }

            await callback(value);
        } catch (error) {
            console.error('Error handling characteristic value:', error);
            showErrorToUser('数据处理错误，请重试');
        }
    };
}

export async function getDeviceInfo(server) {
    const deviceInfo = {};
    try {
        const service = await server.getPrimaryService(DEVICE_CONFIG.SERVICES.DEVICE_INFORMATION);
        
        // 获取制造商名称
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.MANUFACTURER_NAME);
            const value = await characteristic.readValue();
            deviceInfo.manufacturer = new TextDecoder().decode(value);
        } catch (error) {
            console.warn('Error reading manufacturer name:', error);
        }

        // 获取型号
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.MODEL_NUMBER);
            const value = await characteristic.readValue();
            deviceInfo.model = new TextDecoder().decode(value);
        } catch (error) {
            console.warn('Error reading model number:', error);
        }

        // 获取序列号
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.SERIAL_NUMBER);
            const value = await characteristic.readValue();
            deviceInfo.serial = new TextDecoder().decode(value);
        } catch (error) {
            console.warn('Error reading serial number:', error);
        }

        // 获取硬件版本
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.HARDWARE_REVISION);
            const value = await characteristic.readValue();
            deviceInfo.hardware = new TextDecoder().decode(value);
        } catch (error) {
            console.warn('Error reading hardware revision:', error);
        }

        // 获取固件版本
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.FIRMWARE_REVISION);
            const value = await characteristic.readValue();
            deviceInfo.firmware = new TextDecoder().decode(value);
        } catch (error) {
            console.warn('Error reading firmware revision:', error);
        }

        // 获取系统ID
        try {
            const characteristic = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.SYSTEM_ID);
            const value = await characteristic.readValue();
            deviceInfo.systemId = convertSystemIDToString(value);
        } catch (error) {
            console.warn('Error reading system ID:', error);
        }

    } catch (error) {
        console.warn('Error getting device information:', error);
    }

    return deviceInfo;
}

export function parseDeviceName(device) {
    if (!device || !device.name) {
        return 'Unknown Device';
    }
    return device.name;
}

export function handleDeviceDisconnection(event) {
    try {
        // 获取断开连接的设备
        const device = event.target;
        
        // 检查设备对象是否有效
        if (!device) {
            console.error('Disconnection event without valid device');
            return;
        }

        // 更新连接状态
        updateConnectionStatus('未连接');

        // 显示断开连接通知
        const deviceName = device.name || '未知设备';
        console.log(`设备断开连接: ${deviceName}`);
        
        // 显示断开连接通知
        showDisconnectNotification(deviceName);

        // 清理连接状态
        cleanupConnection({
            device: device,
            disconnectedHandler: handleDeviceDisconnection
        });

    } catch (error) {
        console.error('Error in handleDeviceDisconnection:', error);
        showErrorToUser('设备断开连接时发生错误');
    }
}
