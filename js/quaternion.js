// quaternion.js - 四元数类实现
export class Quaternion {
    constructor(w = 1, x = 0, y = 0, z = 0) {
        if ([w, x, y, z].some(val => typeof val !== 'number' || isNaN(val))) {
            throw new Error('Quaternion components must be valid numbers');
        }
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    normalize() {
        const norm = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
        if (norm < Number.EPSILON) {
            console.warn('Attempting to normalize zero quaternion');
            this.w = 1;
            this.x = this.y = this.z = 0;
            return this;
        }
        this.w /= norm;
        this.x /= norm;
        this.y /= norm;
        this.z /= norm;
        return this;
    }

    multiply(q) {
        if (!(q instanceof Quaternion)) {
            throw new Error('Multiply operation requires a Quaternion parameter');
        }
        return new Quaternion(
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
        );
    }

    conjugate() {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }

    clone() {
        return new Quaternion(this.w, this.x, this.y, this.z);
    }

    toEulerAngles() {
        this.normalize();
        const roll = Math.atan2(2 * (this.w * this.x + this.y * this.z),
                              1 - 2 * (this.x * this.x + this.y * this.y));
        const pitch = Math.asin(2 * (this.w * this.y - this.z * this.x));
        const yaw = Math.atan2(2 * (this.w * this.z + this.x * this.y),
                              1 - 2 * (this.y * this.y + this.z * this.z));
        return { roll, pitch, yaw };
    }

    static fromEulerAngles(roll, pitch, yaw) {
        if ([roll, pitch, yaw].some(angle => typeof angle !== 'number' || isNaN(angle))) {
            throw new Error('Euler angles must be valid numbers');
        }
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        return new Quaternion(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy
        );
    }

    toString() {
        return `Quaternion(w=${this.w.toFixed(4)}, x=${this.x.toFixed(4)}, y=${this.y.toFixed(4)}, z=${this.z.toFixed(4)})`;
    }
}
