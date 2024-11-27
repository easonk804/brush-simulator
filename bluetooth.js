// 导入所有需要的文件
import { 
    DEVICE_CONFIG, 
    TARGET_CONFIG, 
    ATTITUDE_CONFIG 
} from './js/config.js';
import { Quaternion } from './js/quaternion.js';
import { 
    delay, 
    doubleByte2Short,
    InvB 
} from './js/utils.js';
import { 
    mahonyFilter
} from './js/filters.js';
import { 
    estimateOrientationByGyro,
    convertAccToAnalogSignal,
    convertGyroToAnalogSignal 
} from './js/dataProcessing.js';
import { 
    updateUI,
    updateConnectionStatus,
    showError
} from './js/uiHelpers.js';
import { 
    handleDeviceDisconnection,
    getDeviceInfo 
} from './js/bluetoothHelpers.js';

/* 加速度计和陀螺仪融合算法参数 */
var currentQuaternion = new Quaternion(1, 0, 0, 0); // 初始化四元数
let dt = ATTITUDE_CONFIG.DT; // 初始化时间间隔(dt)

/* 缓存DOM元素引用 */
const domElements = {
    systemID: document.getElementById('systemID'),
    modelNumber: document.getElementById('modelNumber'),
    firmwareRevision: document.getElementById('firmwareRevision'),
    hardwareRevision: document.getElementById('hardwareRevision'),
    softwareRevision: document.getElementById('softwareRevision'),
    manufacturerName: document.getElementById('manufacturerName'),
    RSSI: document.getElementById('RSSI'),
    charge: document.getElementById('charge'),
    bootBtn: document.getElementById('bootBtn'),
    pwrBtn: document.getElementById('pwrBtn'),
    batVcc: document.getElementById('batVcc'),
    rVcc: document.getElementById('rVcc'),
    acc: document.getElementById('acc'),
    gyro: document.getElementById('gyro'),
    roll: document.getElementById('roll'),
    pitch: document.getElementById('pitch'),
    yaw: document.getElementById('yaw')
};

/* 页面加载完成后初始化 */
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('targetSystemID').innerText = TARGET_CONFIG.DEVICE.SYSTEM_ID;
    document.getElementById('targetModelNumber').innerText = TARGET_CONFIG.DEVICE.MODEL;
    document.getElementById('targetFirmwareRevision').innerText = TARGET_CONFIG.VERSION.FIRMWARE;
    document.getElementById('targetHardwareRevision').innerText = TARGET_CONFIG.VERSION.HARDWARE;
    document.getElementById('targetSoftwareRevision').innerText = TARGET_CONFIG.VERSION.SOFTWARE;
    document.getElementById('targetManfacturerName').innerText = TARGET_CONFIG.DEVICE.MANUFACTURER;
    document.getElementById('targetRSSI').innerText = TARGET_CONFIG.PERFORMANCE.RSSI.TARGET;
    document.getElementById('targetCharge').innerText = 1;
    document.getElementById('targetBatVcc').innerText = TARGET_CONFIG.PERFORMANCE.BATTERY.TARGET_VOLTAGE;
});

// 导出clickme函数
export async function clickme() {
    try {

        console.log("Click me!!!");

        // 1. 检查浏览器支持
        if (!navigator.bluetooth) {
            showError('此浏览器不支持蓝牙，请换个浏览器试试');
            return;
        }

        // 2. 请求连接蓝牙设备
        const device = await navigator.bluetooth.requestDevice({
            filters: [{
                namePrefix: DEVICE_CONFIG.NAME_PREFIX // 只搜索名称前缀为'Artbbit'的设备
            }],
            optionalServices: [
                DEVICE_CONFIG.SERVICES.DEVICE_INFORMATION,
                DEVICE_CONFIG.SERVICES.CUSTOM_SERVICE
            ]
        });

        updateConnectionStatus('正在连接设备...');

        // 3. 设置断开连接监听
        device.addEventListener('gattserverdisconnected', handleDeviceDisconnection);

        // 4. 连接GATT服务器
        const server = await device.gatt.connect();
        await delay(1000); // 等待连接稳定

        updateConnectionStatus('获取设备信息...');

        // 5. 获取设备信息服务
        const deviceInfoService = await server.getPrimaryService(DEVICE_CONFIG.SERVICES.DEVICE_INFORMATION);
        const characteristics = await getDeviceInfo(deviceInfoService);

        // 6. 读取系统ID
        const systemIdValue = await characteristics.systemId.readValue();
        const systemIdArray = new Uint8Array(systemIdValue.buffer);
        const systemId = Array.from(systemIdArray.slice(0, -1))
            .map(byte => byte.toString(16))
            .join(' ');

        // 7. 读取设备信息
        const decoder = new TextDecoder('utf-8');
        const deviceInfo = {
            systemId: systemId,
            modelNumber: decoder.decode(await characteristics.modelNumber.readValue()),
            firmwareRevision: decoder.decode(await characteristics.firmwareRevision.readValue()),
            hardwareRevision: decoder.decode(await characteristics.hardwareRevision.readValue()),
            softwareRevision: decoder.decode(await characteristics.softwareRevision.readValue()),
            manufacturerName: decoder.decode(await characteristics.manufacturerName.readValue())
        };

        updateUI(deviceInfo);
        updateConnectionStatus('设备信息获取完成');

        // 8. 获取自定义服务
        const customService = await server.getPrimaryService(DEVICE_CONFIG.SERVICES.CUSTOM_SERVICE);
        const characteristicR = await customService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.CUSTOM_READ);
        const characteristicW = await customService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.CUSTOM_WRITE);

        await characteristicR.startNotifications();
        updateConnectionStatus('数据通道已建立');

        // 9. 设置数据接收监听器
        characteristicR.addEventListener('characteristicvaluechanged', async (e) => {
            const buff = new Uint8Array(e.target.value.buffer);
            
            // 解析基本数据
            var RSSI = InvB(buff[0]); // 信号强度
            var pwrIn = buff[1]; // 电源输入状态
                var charge = buff[2]; // 充电状态
                var batVcc = (((buff[3] << 8) | buff[4]) / 1000 ); // 电池电压
                var bootBtn = buff[5]; // Boot按钮状态
                var pwrBtn = buff[6]; // 电源按钮状态	
                var rVcc = (buff[7] << 8) | buff[8]; // 电阻电压

            // 解析传感器数据
            var accX = doubleByte2Short(buff[9], buff[10]);
            var accY = doubleByte2Short(buff[11], buff[12]);
            var accZ = doubleByte2Short(buff[13], buff[14]);
            var gyroX = doubleByte2Short(buff[15], buff[16]);
            var gyroY = doubleByte2Short(buff[17], buff[18]);
            var gyroZ = doubleByte2Short(buff[19], buff[20]);

            // 数据处理
            const accData = convertAccToAnalogSignal(accX, accY, accZ);
            const gyroData = convertGyroToAnalogSignal(gyroX, gyroY, gyroZ);
            
            // 姿态估计
            mahonyFilter(accX, accY, accZ, gyroX, gyroY, gyroZ, dt, currentQuaternion);
            const orientation = estimateOrientationByGyro(currentQuaternion);

            // 更新UI
            updateUI({
                charge,
                bootBtn,
                pwrBtn,
                batVcc,
                rVcc,
                acc: `${accData.x.toFixed(2)}, ${accData.y.toFixed(2)}, ${accData.z.toFixed(2)}`,
                gyro: `${gyroData.x.toFixed(2)}, ${gyroData.y.toFixed(2)}, ${gyroData.z.toFixed(2)}`,
                orientation
            });

            // 获取RSSI
            if (device.gatt.connected) {
                const rssi = await device.gatt.RSSI;
                updateUI({ RSSI: rssi });
            }
        });

    } catch (error) {
        console.error('蓝牙连接错误:', error);
        showError(`蓝牙连接失败: ${error.message}`);
        updateConnectionStatus('连接失败');
    }
}

// 初始化连接按钮
document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connectButton');
    if (connectButton) {
        console.log('找到连接按钮，添加点击事件监听器');
        connectButton.addEventListener('click', async () => {
            try {
                await clickme();
            } catch (error) {
                console.error('蓝牙连接错误:', error);
                alert('蓝牙连接失败: ' + error.message);
            }
        });
    } else {
        console.error('连接按钮未找到！');
        alert('页面加载错误：未找到连接按钮');
    }
});
