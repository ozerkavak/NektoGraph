export class Mat4 {
    data;
    constructor() {
        this.data = new Float32Array(16);
        this.identity();
    }
    identity() {
        this.data.fill(0);
        this.data[0] = 1;
        this.data[5] = 1;
        this.data[10] = 1;
        this.data[15] = 1;
        return this;
    }
    static perspective(fovy, aspect, near, far) {
        const out = new Mat4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        out.data[0] = f / aspect;
        out.data[5] = f;
        out.data[10] = (far + near) * nf;
        out.data[11] = -1;
        out.data[14] = (2 * far * near) * nf;
        out.data[15] = 0;
        return out;
    }
    static lookAt(eye, center, up) {
        const out = new Mat4();
        const eyex = eye[0], eyey = eye[1], eyez = eye[2];
        const upx = up[0], upy = up[1], upz = up[2];
        const centerx = center[0], centery = center[1], centerz = center[2];
        let z0 = eyex - centerx, z1 = eyey - centery, z2 = eyez - centerz;
        let len = 1 / Math.hypot(z0, z1, z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;
        let x0 = upy * z2 - upz * z1;
        let x1 = upz * z0 - upx * z2;
        let x2 = upx * z1 - upy * z0;
        len = Math.hypot(x0, x1, x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        }
        else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }
        let y0 = z1 * x2 - z2 * x1;
        let y1 = z2 * x0 - z0 * x2;
        let y2 = z0 * x1 - z1 * x0;
        len = Math.hypot(y0, y1, y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        }
        else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }
        out.data[0] = x0;
        out.data[1] = y0;
        out.data[2] = z0;
        out.data[3] = 0;
        out.data[4] = x1;
        out.data[5] = y1;
        out.data[6] = z1;
        out.data[7] = 0;
        out.data[8] = x2;
        out.data[9] = y2;
        out.data[10] = z2;
        out.data[11] = 0;
        out.data[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out.data[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out.data[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out.data[15] = 1;
        return out;
    }
    multiply(other) {
        const out = new Mat4();
        const a = this.data;
        const b = other.data;
        const outData = out.data;
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        outData[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        outData[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        outData[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        outData[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[4];
        b1 = b[5];
        b2 = b[6];
        b3 = b[7];
        outData[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        outData[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        outData[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        outData[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[8];
        b1 = b[9];
        b2 = b[10];
        b3 = b[11];
        outData[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        outData[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        outData[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        outData[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = b[12];
        b1 = b[13];
        b2 = b[14];
        b3 = b[15];
        outData[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        outData[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        outData[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        outData[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    }
    // Projects a 3D point (x,y,z) to 2D NDC space
    // v is [x, y, z, w=1]
    project(v) {
        const d = this.data;
        const x = v[0], y = v[1], z = v[2];
        const w = 1;
        // Column-major mult: M * v
        const _x = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
        const _y = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
        const _z = d[2] * x + d[6] * y + d[10] * z + d[14] * w;
        const _w = d[3] * x + d[7] * y + d[11] * z + d[15] * w;
        return [_x / _w, _y / _w, _z / _w]; // NDC
    }
    multiplyVec4(v) {
        const d = this.data;
        const x = v[0], y = v[1], z = v[2], w = v[3];
        return [
            d[0] * x + d[4] * y + d[8] * z + d[12] * w,
            d[1] * x + d[5] * y + d[9] * z + d[13] * w,
            d[2] * x + d[6] * y + d[10] * z + d[14] * w,
            d[3] * x + d[7] * y + d[11] * z + d[15] * w
        ];
    }
    invert() {
        const out = new Mat4();
        const a = this.data;
        const outData = out.data;
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;
        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det)
            return out;
        det = 1.0 / det;
        outData[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        outData[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        outData[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        outData[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        outData[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        outData[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        outData[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        outData[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        outData[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        outData[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        outData[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        outData[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        outData[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        outData[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        outData[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        outData[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
        return out;
    }
}
export class Ray {
    origin;
    direction;
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
    // Intersect Sphere
    // Returns distance or -1 if no hit
    intersectSphere(center, radius) {
        const ox = this.origin[0] - center[0];
        const oy = this.origin[1] - center[1];
        const oz = this.origin[2] - center[2];
        const dx = this.direction[0];
        const dy = this.direction[1];
        const dz = this.direction[2];
        const a = dx * dx + dy * dy + dz * dz;
        const b = 2 * (ox * dx + oy * dy + oz * dz);
        const c = ox * ox + oy * oy + oz * oz - radius * radius;
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0)
            return -1;
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        return t;
    }
}
