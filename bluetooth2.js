class Quaternion {
    /* 描述四元数的类 */
    
    constructor(w, x, y, z) {
        /* 构造器 */

        this.w = w; // 实部
        this.x = x; // 虚部
        this.y = y; // 虚部
        this.z = z; // 虚部
    }
    
    normalize() {
        /* 四元数归一化 */

        const norm = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
        this.w /= norm;
        this.x /= norm;
        this.y /= norm;
        this.z /= norm;
    }

}

/* 设备配置常量 */
const DEVICE_CONFIG = {
    NAME_PREFIX: 'Artbbit',
    SERVICES: {
        DEVICE_INFO: 0x180A,
        CUSTOM: '0000ffe0-0000-1000-8000-00805f9b34fb'
    },
    CHARACTERISTICS: {
        SYSTEM_ID: 0x2A23,
        MODEL_NUMBER: 0x2A24,
        FIRMWARE_REV: 0x2A26,
        HARDWARE_REV: 0x2A27,
        SOFTWARE_REV: 0x2A28,
        MANUFACTURER: 0x2A29,
        CUSTOM_READ: '0000ffe4-0000-1000-8000-00805f9b34fb',
        CUSTOM_WRITE: '0000ffe3-0000-1000-8000-00805f9b34fb'
    }
};

/* 传感器配置常量 */
const SENSOR_CONFIG = {
    ACCELEROMETER: {
        MIN_VALUE: -Math.pow(2, 15),
        MAX_VALUE: Math.pow(2, 15),
        ANALOG_MIN: -20,
        ANALOG_MAX: 20
    },
    GYROSCOPE: {
        MIN_VALUE: -Math.pow(2, 15),
        MAX_VALUE: Math.pow(2, 15),
        ANALOG_MIN: -250,
        ANALOG_MAX: 250
    }
};

/* 姿态估计配置常量 */
const ATTITUDE_CONFIG = {
    DT: 0.01,
    KP: 2.0,
    KI: 0.005
};

/* 设计目标参数定义 */
var targetSystemID = '-'; // 系统ID
var targetModelNumber = 'Pen'; // 产品型号
var targetFirmwareRevision = '>1.0'; // 固件版本
var targetHardwareRevision = '>1.0'; // 硬件版本 
var targetSoftwareRevision = '>1.0'; // 软件版本
var targetManfacturerName = 'Artbbit'; // 公司名称

var targetRSSI = -60; // 信号强度
var targetCharge = 1; // 充电状态
var targetBatVcc = 3.7; // 目标电池电压

var targetRFLEDCheck = '檢查後，手動勾選';
var targetPanelCheck = '檢查後，手動勾選';

let characteristicW;

/* 加速度计和陀螺仪融合算法参数 */
var currentQuaternion = new Quaternion(1, 0, 0, 0); // 初始化四元数
let dt = ATTITUDE_CONFIG.DT; // 初始化时间间隔(dt)
console.log("初始化的四元数：", currentQuaternion);
console.log("初始化的dt：", dt);
const Kp = ATTITUDE_CONFIG.KP; // 比例增益
const Ki = ATTITUDE_CONFIG.KI; // 积分增益
let integralFBx = 0; // 积分反馈X
let integralFBy = 0; // 积分反馈Y
let integralFBz = 0; // 积分反馈Z

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

/* 使用防抖函数优化频繁更新 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* 优化更新UI的函数 */
const updateUI = debounce((data) => {
    const {
        systemID, modelNumber, firmwareRevision, hardwareRevision,
        softwareRevision, manufacturerName, RSSI, charge, bootBtn,
        pwrBtn, batVcc, rVcc, acc, gyro, orientation
    } = data;

    // 批量更新DOM
    if (systemID) domElements.systemID.innerText = systemID;
    if (modelNumber) domElements.modelNumber.innerText = modelNumber;
    if (firmwareRevision) domElements.firmwareRevision.innerText = firmwareRevision;
    if (hardwareRevision) domElements.hardwareRevision.innerText = hardwareRevision;
    if (softwareRevision) domElements.softwareRevision.innerText = softwareRevision;
    if (manufacturerName) domElements.manufacturerName.innerText = manufacturerName;
    if (RSSI) domElements.RSSI.innerText = RSSI;
    if (charge) domElements.charge.innerText = charge;
    if (bootBtn) domElements.bootBtn.innerText = bootBtn;
    if (pwrBtn) domElements.pwrBtn.innerText = pwrBtn;
    if (batVcc) domElements.batVcc.innerText = batVcc + ' V';
    if (rVcc) domElements.rVcc.innerText = rVcc;
    if (acc) domElements.acc.innerText = acc;
    if (gyro) domElements.gyro.innerText = gyro;
    
    if (orientation) {
        domElements.roll.innerText = orientation.roll.toFixed(2) + '°';
        domElements.pitch.innerText = orientation.pitch.toFixed(2) + '°';
        domElements.yaw.innerText = orientation.yaw.toFixed(2) + '°';
    }
}, 16); // 约60fps的更新频率

/* 页面加载完成后初始化 */
window.onload = function() {

    document.getElementById('targetSystemID').innerText = targetSystemID;
    document.getElementById('targetModelNumber').innerText = targetModelNumber;
    document.getElementById('targetFirmwareRevision').innerText = targetFirmwareRevision;
    document.getElementById('targetHardwareRevision').innerText = targetHardwareRevision;
    document.getElementById('targetSoftwareRevision').innerText = targetSoftwareRevision;
    document.getElementById('targetManfacturerName').innerText = targetManfacturerName;
    document.getElementById('targetRSSI').innerText = targetRSSI;
    document.getElementById('targetCharge').innerText = targetCharge;
    document.getElementById('targetBatVcc').innerText = targetBatVcc;
};

function InvB(v){
    /* 补码转源码函数 */
    // 获取符号位（最高位）
    var sign = v & (1 << 7); // 与10000000进行与运算
    // 获取数值位（低7位）
    var n = v & 0x7F; // 与01111111进行与计算
    // 如果是负数（符号位为1）
    if (sign) {					   
            n =  (n ^ 0x7F ) + 1;
            n *= -1;
    }
    return n;
}

async function clickme() {
    /* 蓝牙连接的主要功能 */

    try {
        console.log("Click me!!!")

        // 1.检查浏览器是否支持Web Bluetooth API
        if (!navigator.bluetooth) {
            throw new Error('此浏览器不支持蓝牙，请换个浏览器试试');
        } 

        // 2.请求连接蓝牙设备
        let device;
        try {
            device = await navigator.bluetooth.requestDevice({

                // 设置设备过滤条件
                filters: [{
                    namePrefix: DEVICE_CONFIG.NAME_PREFIX // 只搜索名称前缀为'Artbbit'的设备
                }],
                // 声明需要使用的蓝牙服务UUID列表
                optionalServices: [
                    DEVICE_CONFIG.SERVICES.DEVICE_INFO, // 设备信息服务
                    DEVICE_CONFIG.SERVICES.CUSTOM, // 自定义服务
                ]
            });
        } catch (error) {
            throw new Error('蓝牙设备连接失败：' + error.message);
        }

        // 3.添加设备连接断开的事件监听
        device.addEventListener('gattserverdisconnected', onDisconnected);

        // 4. 建立GATT服务器连接
        let server;
        try {
            server = await device.gatt.connect();
        } catch (error) {
            throw new Error('GATT服务器连接失败：' + error.message);
        }

        // 等待1s确保连接稳定
        delay(1000);

        // 5.获取设备信息服务
        let deviceService;
        try {
            deviceService = await server.getPrimaryService(DEVICE_CONFIG.SERVICES.DEVICE_INFO); // "根" 服務的 UUID
        } catch (error) {
            throw new Error('获取设备信息服务失败：' + error.message);
        }

        // 6.获取各种设备信息特征值
        let systemIDServiceR =         await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.SYSTEM_ID); // "讀" 服務的 UUID			
        let modelNumberServiceR =      await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.MODEL_NUMBER); // "讀" 服務的 UUID			
        let firmwareRevisionServiceR = await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.FIRMWARE_REV); // "讀" 服務的 UUID
        let hardwareRevisionServiceR = await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.HARDWARE_REV); // "讀" 服務的 UUID
        let softwareRevisionServiceR = await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.SOFTWARE_REV); // "讀" 服務的 UUID
        let manfacturerNameServiceR =  await deviceService.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.MANUFACTURER); // "讀" 服務的 UUID

        //------------------------------------------
        // 检测硬件信息是否在设计目标内：

        // 7.读取系统ID获取其值
        var statusSystemIDValue = await systemIDServiceR.readValue(); // 返回的是1个DataView对象，包含了原始的二进制数据

        // 将DataView转换为Uint8Array（8位无符号整数数组）
        var statusSystemIDValueArray = new Uint8Array(statusSystemIDValue.buffer); // buffer属性获取底层的ArrayBuffer
        
        // 初始化空字符串，用于存储转换后的16进制字符串
        var systemID = '';
        // 将字节数组转换为16进制字符串
        for(var i=0; i < statusSystemIDValueArray.length-1; i++){
            systemID += statusSystemIDValueArray[i].toString(16) + ' ';
        }
        document.getElementById('systemID').innerText = systemID;

        // 8.创建UTF-8解码器
        let decoder = new TextDecoder('utf-8');

        // 9.读取和解码其他设备信息
        var modelNumber = decoder.decode(await modelNumberServiceR.readValue());
        var firmwareRevision = decoder.decode(await firmwareRevisionServiceR.readValue());
        var hardwareRevision = decoder.decode(await hardwareRevisionServiceR.readValue());
        var softwareRevision = decoder.decode(await softwareRevisionServiceR.readValue());
        var manufacturerName = decoder.decode(await manfacturerNameServiceR.readValue());

        // 10.将设备信息显示到页面
        document.getElementById('modelNumber').innerText = modelNumber;
        document.getElementById('firmwareRevision').innerText = firmwareRevision;
        document.getElementById('hardwareRevision').innerText = hardwareRevision;
        document.getElementById('softwareRevision').innerText = softwareRevision;
        document.getElementById('manfacturerName').innerText = manufacturerName;

        // 11.获取自定义服务和特征值
        let service = await server.getPrimaryService(DEVICE_CONFIG.SERVICES.CUSTOM); // "根" 服務的 UUID
        let characteristicW = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.CUSTOM_WRITE); // "寫" 服務的 UUID
        let characteristicR = await service.getCharacteristic(DEVICE_CONFIG.CHARACTERISTICS.CUSTOM_READ); // "讀" 服務的 UUID

        // 12.启动通知
        await characteristicR.startNotifications(); // 开始监听

        // 13.添加数据接收监听器
        characteristicR.addEventListener(
            'characteristicvaluechanged', (e) => {
                // 监听设备端的操作 获取到值之后再解析

                //-------------------------------------------------------------------------
                // 获取接收到的数据
                var buff = new Uint8Array(e.target.value.buffer);

                // 解析RSSI（信号强度）
                var RSSI = InvB(buff[0]);

                // 解析其他数据
                var pwrIn = buff[1]; // 电源输入状态
                var charge = buff[2]; // 充电状态
                var batVcc = (((buff[3] << 8) | buff[4]) / 1000 ); // 电池电压
                var bootBtn = buff[5]; // Boot按钮状态
                var pwrBtn = buff[6]; // 电源按钮状态	
                var rVcc = (buff[7] << 8) | buff[8]; // 电阻电压

                // 解析加速度计数据
                var accX = doubleByte2Short(buff[9], buff[10]);
                var accY = doubleByte2Short(buff[11], buff[12]);
                var accZ = doubleByte2Short(buff[13], buff[14]);

                // 解析陀螺仪数据
                var gyroX = doubleByte2Short(buff[15], buff[16]);
                var gyroY = doubleByte2Short(buff[17], buff[18]);
                var gyroZ = doubleByte2Short(buff[19], buff[20]);

                /* 更新基本参数显示 */
                const data = {
                    RSSI: RSSI,
                    charge: charge,
                    bootBtn: bootBtn,
                    pwrBtn: pwrBtn,
                    batVcc: batVcc,
                    rVcc: rVcc,
                    acc: `${accX}, ${accY}, ${accZ}`,
                    gyro: `${gyroX}, ${gyroY}, ${gyroZ}`,
                    orientation: estimateOrientationByGyro(
                        mahonyFilter(
                            accX, accY, accZ,
                            gyroX, gyroY, gyroZ,
                            dt, currentQuaternion
                        )
                    )
                };

                // 更新显示
                updateUI(data);
            }
        );
    } catch (error) {
        console.error('蓝牙连接错误：', error);
        alert(error.message);
    }
}

function mahonyFilter(accX, accY, accZ, gyroX, gyroY, gyroZ, dt, currentQuaternion) {
    /* 
    主要功能：更新四元数

    参数）
    - accX: 加速度计的X轴数据
    - accY: 加速度计的Y轴数据
    - accZ: 加速度计的Z轴数据
    - gyroX: 陀螺仪的X轴数据
    - gyroY: 陀螺仪的Y轴数据
    - gyroZ: 陀螺仪的Z轴数据
    - dt: 时间间隔
    - currentQuaternion: 当前四元数

    返回）
    - currentQuaternion: 更新后的四元数
    */

    // 计算加速度计的归一化
    const norm = Math.sqrt(accX * accX + accY * accY + accZ * accZ);
    if (norm > 0) {
        accX /= norm;
        accY /= norm;
        accZ /= norm;
    }

    // 计算四元数的当前值
    const q0 = currentQuaternion.w;
    const q1 = currentQuaternion.x;
    const q2 = currentQuaternion.y;
    const q3 = currentQuaternion.z;

    // 计算重力方向
    const vx = 2 * (q1 * q3 - q0 * q2);
    const vy = 2 * (q0 * q1 + q2 * q3);
    const vz = q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3;

    // 计算加速度计的误差
    const ex = (accY * vz - accZ * vy);
    const ey = (accZ * vx - accX * vz);
    const ez = (accX * vy - accY * vx);

    // 积分反馈
    integralFBx += ex * Ki;
    integralFBy += ey * Ki;
    integralFBz += ez * Ki;

    // 陀螺仪的增量
    gyroX += integralFBx;
    gyroY += integralFBy;
    gyroZ += integralFBz;

    // 更新四元数导数部分
    const qDot1 = 0.5 * (-q1 * gyroX - q2 * gyroY - q3 * gyroZ);
    const qDot2 = 0.5 * (q0 * gyroX + q2 * gyroZ - q3 * gyroY);
    const qDot3 = 0.5 * (q0 * gyroY - q1 * gyroZ + q3 * gyroX);
    const qDot4 = 0.5 * (q0 * gyroZ + q1 * gyroY - q2 * gyroX);

    // 更新四元数
    currentQuaternion.w += qDot1 * dt;
    currentQuaternion.x += qDot2 * dt;
    currentQuaternion.y += qDot3 * dt;
    currentQuaternion.z += qDot4 * dt;

    // 归一化的四元数
    currentQuaternion.normalize();

    return currentQuaternion;

}

function estimateOrientationByGyro(currentQuaternion) {
    /* 
    主要功能：估计方向

    参数）
    - currentQuaternion: 当前四元数

    返回）
    - orientation: 方向
    */

    // 计算欧拉角 (roll, pitch, yaw)
    const roll = Math.atan2(2 * (currentQuaternion.w * currentQuaternion.x + currentQuaternion.y * currentQuaternion.z),
                            currentQuaternion.w * currentQuaternion.w - currentQuaternion.x * currentQuaternion.x 
                            - currentQuaternion.y * currentQuaternion.y + currentQuaternion.z * currentQuaternion.z);
    const pitch = Math.asin(2 * (currentQuaternion.w * currentQuaternion.y - currentQuaternion.x * currentQuaternion.z));
    const yaw = Math.atan(2 * (currentQuaternion.w * currentQuaternion.z + currentQuaternion.x * currentQuaternion.y), 
                            currentQuaternion.w * currentQuaternion.w + currentQuaternion.x * currentQuaternion.x 
                            - currentQuaternion.y * currentQuaternion.y - currentQuaternion.z * currentQuaternion.z);

    return {
        roll: roll * (180 / Math.PI),
        pitch: pitch * (180 / Math.PI),
        yaw: yaw * (180 / Math.PI)
    }
}

function updateQuaternion(gyroX, gyroY, gyroZ, dt, currentQuaternion) {
    /* 
    主要功能：更新四元数

    参数）
    - gyroX: 陀螺仪的X轴数据
    - gyroY: 陀螺仪的Y轴数据
    - gyroZ: 陀螺仪的Z轴数据
    - dt: 时间间隔
    - currentQuaternion: 当前四元数

    返回）
    - newQuaternion: 更新后的四元数
    */

    // 将角速度转换为弧度
    const halfDT = dt / 2;

    // 计算四元数增量
    const deltaQ = new Quaternion(
        Math.cos(gyroX * halfDT),
        Math.sin(gyroX * halfDT),
        Math.sin(gyroY * halfDT),
        Math.sin(gyroZ * halfDT)
    )

    // 更新当前四元数
    const newQuaternion = new Quaternion(
        currentQuaternion.w * deltaQ.w - currentQuaternion.x * deltaQ.x - currentQuaternion.y * deltaQ.y - currentQuaternion.z * deltaQ.z,
        currentQuaternion.w * deltaQ.x + currentQuaternion.x * deltaQ.w + currentQuaternion.z * deltaQ.y - currentQuaternion.y * deltaQ.z,
        currentQuaternion.w * deltaQ.y + currentQuaternion.y * deltaQ.w + currentQuaternion.x * deltaQ.z - currentQuaternion.z * deltaQ.x,
        currentQuaternion.w * deltaQ.z + currentQuaternion.z * deltaQ.w + currentQuaternion.y * deltaQ.x - currentQuaternion.x * deltaQ.y
    );

    // 归一化四元数
    newQuaternion.normalize();

    return newQuaternion;
    
}

function convertAccToAnalogSignal(accX, accY, accZ) {
    /*
    主要功能：将加速度转换为模拟信号

    参数）  
    - accX: 加速度的X轴数据
    - accY: 加速度的Y轴数据
    - accZ: 加速度的Z轴数据

    返回） 
    - x: X轴模拟信号
    - y: Y轴模拟信号
    - z: Z轴模拟信号
    */

    return convertToAnalogSignal(
        [accX, accY, accZ],
        SENSOR_CONFIG.ACCELEROMETER.MIN_VALUE,
        SENSOR_CONFIG.ACCELEROMETER.MAX_VALUE,
        SENSOR_CONFIG.ACCELEROMETER.ANALOG_MIN,
        SENSOR_CONFIG.ACCELEROMETER.ANALOG_MAX
    );
}

function convertGyroToAnalogSignal(gyroX, gyroY, gyroZ) {
    /* 
    主要功能：将陀螺仪转换为模拟信号

    参数）
    - gyroX: 陀螺仪的X轴数据
    - gyroY: 陀螺仪的Y轴数据
    - gyroZ: 陀螺仪的Z轴数据

    返回）
    - x: X轴模拟信号
    - y: Y轴模拟信号
    - z: Z轴模拟信号
    */

    return convertToAnalogSignal(
        [gyroX, gyroY, gyroZ],
        SENSOR_CONFIG.GYROSCOPE.MIN_VALUE,
        SENSOR_CONFIG.GYROSCOPE.MAX_VALUE,
        SENSOR_CONFIG.GYROSCOPE.ANALOG_MIN,
        SENSOR_CONFIG.GYROSCOPE.ANALOG_MAX
    );
}

function convertToAnalogSignal(values, minValue, maxValue, analogMin, analogMax) {
    /* 
    主要功能：将陀螺仪转换为模拟信号

    参数）
    - values: 传感器数据
    - minValue: 传感器最小值
    - maxValue: 传感器最大值
    - analogMin: 模拟信号最小值
    - analogMax: 模拟信号最大值

    返回）
    - x: X轴模拟信号
    - y: Y轴模拟信号
    - z: Z轴模拟信号
    */

    const mapToAnalog = (value) => {
        return ((value - minValue) / (maxValue - minValue)) * (analogMax - analogMin) + analogMin;
    };

    return {
        x: mapToAnalog(values[0]),
        y: mapToAnalog(values[1]),
        z: mapToAnalog(values[2])
    };
}

function doubleByte2Short(byteH, byteL){
    /*
        主要功能：
        1. 将两个字节(高字节和低字节)转换为一个有符号的16位短整型数
        2. 处理符号位,确保负数能够正确表示
        3. 主要用于解析来自设备的传感器数据(如加速度计、陀螺仪等)

        工作原理：
        1. 首先检查高字节的最高位(符号位)
        2. 将高字节和低字节组合成16位数
        3. 如果是负数,则通过符号扩展确保正确的负数表示
        4. 返回最终的有符号数值
        这种转换在处理传感器数据时很常见,因为许多传感器输出的原始数据
        都是以两个字节的补码形式表示的有符号值。
    */

    // 获取高字节的符号位（最高位）
    // byteH & (1<<7)与1000000进行与运算，判断最高位是否为1
    var sign = byteH & (1 << 7);
    // 将2个字节组合成16位整数
    // byteH <<8 ：高字节左移8位
    // | byteL：与低字节进行或运算，组合成完整的16位数
    var n = ((byteH << 8) | byteL);
    // 如果是负数（符号位为1），需要进行符号扩展
    if (sign) {
        // 将高16位全部填充为1
        // 0xFFFF0000 = 11111111111111110000000000000000
        // 这样可以保持负数的二进制补码表示正确
       n |= 0xFFFF0000;  // fill in most significant bits with 1's
    }
    // 返回转换后的有符号短整型数值
    return n;
}

function onDisconnected(event) {
    /*
    主要功能：在蓝牙设备断开连接时自动触发

    参数）
    - event: 断开连接事件对象
    */

    // event参数是断开连接事件对象，包含了设备信息
    // event.target指向断开连接的蓝牙设备对象 
    const device = event.target; 
    // 弹出提示框,显示断开连接的设备名称
    // device.name获取设备的蓝牙广播名称
    alert('設備 : ' + device.name + ' 已经断开连接');
}

function delay(ms) {
    /*
    主要功能：在异步操作中实现暂停效果

    参数）  
    - ms（number）：延时时间（毫秒）

    返回）
    - Promise
    */

    // 返回1个Promise对象
    // setTimeout在指定时间后调用resolve函数
    // resolve函数的调用会让Promise进入fulfilled状态
    return new Promise(resolve => setTimeout(resolve, ms));
}
