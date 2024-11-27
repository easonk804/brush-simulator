// config.js - 配置常量

/* 设备配置常量 */
export const DEVICE_CONFIG = {
    NAME_PREFIX: 'Artbit',
    SERVICES: {
        DEVICE_INFORMATION: '180a',
        CUSTOM_SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
    },
    CHARACTERISTICS: {
        SYSTEM_ID: '2a23',
        MODEL_NUMBER: '2a24',
        SERIAL_NUMBER: '2a25',
        FIRMWARE_REVISION: '2a26',
        HARDWARE_REVISION: '2a27',
        SOFTWARE_REVISION: '2a28',
        MANUFACTURER_NAME: '2a29',
        CUSTOM_CHARACTERISTIC: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
    }
};

/* 传感器配置常量 */
export const SENSOR_CONFIG = {
    ACCELEROMETER: {
        RANGE: 16,  // g
        SENSITIVITY: 2048,  // LSB/g
        SAMPLING_RATE: 100  // Hz
    },
    GYROSCOPE: {
        RANGE: 2000,  // deg/s
        SENSITIVITY: 16.4,  // LSB/(deg/s)
        SAMPLING_RATE: 100  // Hz
    },
    MAGNETOMETER: {
        RANGE: 4800,  // uT
        SENSITIVITY: 0.15  // uT/LSB
    }
};

/* 滤波器参数配置 */
export const FILTER_CONFIG = {
    ACC_LPF_ALPHA: 0.1,
    GYRO_LPF_ALPHA: 0.1,
    ACC_KF_Q: 0.001,
    ACC_KF_R: 0.1,
    GYRO_KF_Q: 0.001,
    GYRO_KF_R: 0.1,
    MAHONY_KP: 0.5,
    MAHONY_KI: 0.1
};

/* 姿态估计配置常量 */
export const ATTITUDE_CONFIG = {
    DT: 0.01,           // 采样时间间隔 (s)
    KP: 2.0,           // 比例增益
    KI: 0.005          // 积分增益
};

// 初始化时间间隔
export const dt = ATTITUDE_CONFIG.DT;

/* 设计目标参数配置 */
export const TARGET_CONFIG = {
    // 设备标识信息
    DEVICE: {
        SYSTEM_ID: '-',                // 系统ID
        MODEL: 'Pen',                  // 产品型号
        MANUFACTURER: 'Artbit'         // 制造商名称
    },

    // 版本信息要求
    VERSION: {
        FIRMWARE: '>1.0',             // 固件版本要求
        HARDWARE: '>1.0',             // 硬件版本要求
        SOFTWARE: '>1.0'              // 软件版本要求
    },

    // 性能指标
    PERFORMANCE: {
        RSSI: {
            MIN: -90,                  // 最小信号强度 (dBm)
            TARGET: -60                // 目标信号强度 (dBm)
        },
        BATTERY: {
            MIN_VOLTAGE: 3.7,          // 最小电池电压 (V)
            MAX_VOLTAGE: 4.2,          // 最大电池电压 (V)
            TARGET_VOLTAGE: 4.0        // 目标电池电压 (V)
        }
    },

    // 传感器参数
    SENSORS: {
        ACCELEROMETER: {
            RANGE: [-16, 16],          // 加速度计量程 (g)
            RESOLUTION: 16,            // 分辨率 (bits)
            SAMPLE_RATE: 100           // 采样率 (Hz)
        },
        GYROSCOPE: {
            RANGE: [-2000, 2000],      // 陀螺仪量程 (dps)
            RESOLUTION: 16,            // 分辨率 (bits)
            SAMPLE_RATE: 100           // 采样率 (Hz)
        }
    }
};
