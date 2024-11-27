// filters.js - 滤波器和数据平滑
import { FILTER_CONFIG } from './config.js';

export function kalmanFilter(measurement, state, Q, R) {
    // 预测
    const prediction = state.value;
    const predictionError = state.error + Q;

    // 更新
    const kalmanGain = predictionError / (predictionError + R);
    const value = prediction + kalmanGain * (measurement - prediction);
    const error = (1 - kalmanGain) * predictionError;

    return { value, error };
}

export function lowPassFilter(newValue, lastValue, alpha) {
    if (typeof alpha !== 'number' || alpha < 0 || alpha > 1) {
        throw new Error('Alpha must be a number between 0 and 1');
    }
    return alpha * newValue + (1 - alpha) * lastValue;
}

export function smoothAccData(accData, state = {}) {
    const { ACC_LPF_ALPHA, ACC_KF_Q, ACC_KF_R } = FILTER_CONFIG;

    // 初始化状态
    if (!state.lpf) {
        state.lpf = { x: accData.x, y: accData.y, z: accData.z };
    }
    if (!state.kf) {
        state.kf = {
            x: { value: accData.x, error: 1 },
            y: { value: accData.y, error: 1 },
            z: { value: accData.z, error: 1 }
        };
    }

    // 低通滤波
    const lpfResult = {
        x: lowPassFilter(accData.x, state.lpf.x, ACC_LPF_ALPHA),
        y: lowPassFilter(accData.y, state.lpf.y, ACC_LPF_ALPHA),
        z: lowPassFilter(accData.z, state.lpf.z, ACC_LPF_ALPHA)
    };
    state.lpf = lpfResult;

    // 卡尔曼滤波
    const kfResult = {
        x: kalmanFilter(lpfResult.x, state.kf.x, ACC_KF_Q, ACC_KF_R),
        y: kalmanFilter(lpfResult.y, state.kf.y, ACC_KF_Q, ACC_KF_R),
        z: kalmanFilter(lpfResult.z, state.kf.z, ACC_KF_Q, ACC_KF_R)
    };
    state.kf = kfResult;

    return {
        x: kfResult.x.value,
        y: kfResult.y.value,
        z: kfResult.z.value
    };
}

export function smoothGyroData(gyroData, state = {}) {
    const { GYRO_LPF_ALPHA, GYRO_KF_Q, GYRO_KF_R } = FILTER_CONFIG;

    // 初始化状态
    if (!state.lpf) {
        state.lpf = { x: gyroData.x, y: gyroData.y, z: gyroData.z };
    }
    if (!state.kf) {
        state.kf = {
            x: { value: gyroData.x, error: 1 },
            y: { value: gyroData.y, error: 1 },
            z: { value: gyroData.z, error: 1 }
        };
    }

    // 低通滤波
    const lpfResult = {
        x: lowPassFilter(gyroData.x, state.lpf.x, GYRO_LPF_ALPHA),
        y: lowPassFilter(gyroData.y, state.lpf.y, GYRO_LPF_ALPHA),
        z: lowPassFilter(gyroData.z, state.lpf.z, GYRO_LPF_ALPHA)
    };
    state.lpf = lpfResult;

    // 卡尔曼滤波
    const kfResult = {
        x: kalmanFilter(lpfResult.x, state.kf.x, GYRO_KF_Q, GYRO_KF_R),
        y: kalmanFilter(lpfResult.y, state.kf.y, GYRO_KF_Q, GYRO_KF_R),
        z: kalmanFilter(lpfResult.z, state.kf.z, GYRO_KF_Q, GYRO_KF_R)
    };
    state.kf = kfResult;

    return {
        x: kfResult.x.value,
        y: kfResult.y.value,
        z: kfResult.z.value
    };
}

export function mahonyFilter(accX, accY, accZ, gyroX, gyroY, gyroZ, dt, currentQuaternion) {
    const { MAHONY_KP, MAHONY_KI } = FILTER_CONFIG;
    
    // 归一化加速度
    const norm = Math.sqrt(accX * accX + accY * accY + accZ * accZ);
    if (norm === 0) return currentQuaternion;
    
    const ax = accX / norm;
    const ay = accY / norm;
    const az = accZ / norm;

    // 估计重力方向
    const qw = currentQuaternion.w;
    const qx = currentQuaternion.x;
    const qy = currentQuaternion.y;
    const qz = currentQuaternion.z;

    const vx = 2 * (qx * qz - qw * qy);
    const vy = 2 * (qw * qx + qy * qz);
    const vz = qw * qw - qx * qx - qy * qy + qz * qz;

    // 计算误差
    const ex = ay * vz - az * vy;
    const ey = az * vx - ax * vz;
    const ez = ax * vy - ay * vx;

    // 积分误差
    let integralX = 0;
    let integralY = 0;
    let integralZ = 0;

    integralX += ex * dt;
    integralY += ey * dt;
    integralZ += ez * dt;

    // 应用PI控制
    const gx = gyroX + MAHONY_KP * ex + MAHONY_KI * integralX;
    const gy = gyroY + MAHONY_KP * ey + MAHONY_KI * integralY;
    const gz = gyroZ + MAHONY_KP * ez + MAHONY_KI * integralZ;

    // 四元数积分
    const qa = currentQuaternion.w;
    const qb = currentQuaternion.x;
    const qc = currentQuaternion.y;
    const qd = currentQuaternion.z;

    currentQuaternion.w += (-qb * gx - qc * gy - qd * gz) * dt * 0.5;
    currentQuaternion.x += (qa * gx + qc * gz - qd * gy) * dt * 0.5;
    currentQuaternion.y += (qa * gy - qb * gz + qd * gx) * dt * 0.5;
    currentQuaternion.z += (qa * gz + qb * gy - qc * gx) * dt * 0.5;

    currentQuaternion.normalize();
    return currentQuaternion;
}
