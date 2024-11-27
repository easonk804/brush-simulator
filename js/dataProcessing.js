// dataProcessing.js - 数据处理相关函数
import { SENSOR_CONFIG } from './config.js';
import { Quaternion } from './quaternion.js';

/**
 * 将加速度计原始数据转换为模拟信号值
 * @param {number} accX - X轴加速度原始数据
 * @param {number} accY - Y轴加速度原始数据
 * @param {number} accZ - Z轴加速度原始数据
 * @returns {Object} 转换后的加速度数据，包含x、y、z三个属性
 */
export function convertAccToAnalogSignal(accX, accY, accZ) {
    const { RANGE, SENSITIVITY } = SENSOR_CONFIG.ACCELEROMETER;
    return {
        x: convertToAnalogSignal(accX, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY),
        y: convertToAnalogSignal(accY, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY),
        z: convertToAnalogSignal(accZ, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY)
    };
}

/**
 * 将陀螺仪原始数据转换为模拟信号值
 * @param {number} gyroX - X轴角速度原始数据
 * @param {number} gyroY - Y轴角速度原始数据
 * @param {number} gyroZ - Z轴角速度原始数据
 * @returns {Object} 转换后的角速度数据，包含x、y、z三个属性
 */
export function convertGyroToAnalogSignal(gyroX, gyroY, gyroZ) {
    const { RANGE, SENSITIVITY } = SENSOR_CONFIG.GYROSCOPE;
    return {
        x: convertToAnalogSignal(gyroX, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY),
        y: convertToAnalogSignal(gyroY, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY),
        z: convertToAnalogSignal(gyroZ, -RANGE, RANGE, -SENSITIVITY, SENSITIVITY)
    };
}

/**
 * 将数值从数字信号映射到模拟信号
 * @param {number} value - 需要转换的原始值
 * @param {number} minValue - 原始值的最小范围
 * @param {number} maxValue - 原始值的最大范围
 * @param {number} analogMin - 目标范围的最小值
 * @param {number} analogMax - 目标范围的最大值
 * @returns {number} 映射后的值
 */
export function convertToAnalogSignal(value, minValue, maxValue, analogMin, analogMax) {
    if (value < minValue) value = minValue;
    if (value > maxValue) value = maxValue;
    
    const scale = (analogMax - analogMin) / (maxValue - minValue);
    return (value - minValue) * scale + analogMin;
}

/**
 * 校正加速度计X轴的偏差
 * @param {number} accX - X轴加速度原始值
 * @returns {number} 校正后的X轴加速度值
 * @description 根据温度和其他因素校正加速度计X轴偏差，可以添加更复杂的校正算法
 */
export function correctAccXBias(accX) {
    const BIAS_CORRECTION = -0.05;  // 示例偏差校正值
    return accX + BIAS_CORRECTION;
}

/**
 * 使用陀螺仪数据估计当前姿态
 * @param {Quaternion} currentQuaternion - 当前姿态四元数
 * @param {number} gyroX - X轴角速度（度/秒）
 * @param {number} gyroY - Y轴角速度（度/秒）
 * @param {number} gyroZ - Z轴角速度（度/秒）
 * @param {number} dt - 采样时间间隔（秒）
 * @returns {Quaternion} 更新后的姿态四元数
 * @description 使用角速度数据更新当前姿态四元数，实现姿态估计
 */
export function estimateOrientationByGyro(currentQuaternion, gyroX, gyroY, gyroZ, dt) {
    // 将角速度转换为弧度/秒
    const gx = gyroX * Math.PI / 180.0;
    const gy = gyroY * Math.PI / 180.0;
    const gz = gyroZ * Math.PI / 180.0;

    // 创建角速度四元数
    const gyroQuat = new Quaternion(
        0,
        gx * dt * 0.5,
        gy * dt * 0.5,
        gz * dt * 0.5
    );

    // 更新当前姿态四元数
    const result = currentQuaternion.multiply(gyroQuat);
    result.normalize();
    return result;
}

/**
 * 更新姿态四元数
 * @param {number} gyroX - X轴角速度（度/秒）
 * @param {number} gyroY - Y轴角速度（度/秒）
 * @param {number} gyroZ - Z轴角速度（度/秒）
 * @param {number} dt - 采样时间间隔（秒）
 * @param {Quaternion} currentQuaternion - 当前姿态四元数
 * @returns {Quaternion} 更新后的姿态四元数
 * @description 使用四元数微分方程更新姿态，提供更准确的姿态估计
 */
export function updateQuaternion(gyroX, gyroY, gyroZ, dt, currentQuaternion) {
    // 将角速度转换为弧度/秒
    const gx = gyroX * Math.PI / 180.0;
    const gy = gyroY * Math.PI / 180.0;
    const gz = gyroZ * Math.PI / 180.0;

    // 计算四元数变化率
    const qDot = new Quaternion(
        -0.5 * (currentQuaternion.x * gx + currentQuaternion.y * gy + currentQuaternion.z * gz),
        0.5 * (currentQuaternion.w * gx + currentQuaternion.y * gz - currentQuaternion.z * gy),
        0.5 * (currentQuaternion.w * gy - currentQuaternion.x * gz + currentQuaternion.z * gx),
        0.5 * (currentQuaternion.w * gz + currentQuaternion.x * gy - currentQuaternion.y * gx)
    );

    // 更新四元数
    const newQuaternion = new Quaternion(
        currentQuaternion.w + qDot.w * dt,
        currentQuaternion.x + qDot.x * dt,
        currentQuaternion.y + qDot.y * dt,
        currentQuaternion.z + qDot.z * dt
    );

    // 归一化
    newQuaternion.normalize();
    return newQuaternion;
}
