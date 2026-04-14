export declare class Mat4 {
    data: Float32Array;
    constructor();
    identity(): this;
    static perspective(fovy: number, aspect: number, near: number, far: number): Mat4;
    static lookAt(eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Mat4;
    multiply(other: Mat4): Mat4;
    project(v: [number, number, number]): [number, number, number];
    multiplyVec4(v: [number, number, number, number]): [number, number, number, number];
    invert(): Mat4;
}
export declare class Ray {
    origin: [number, number, number];
    direction: [number, number, number];
    constructor(origin: [number, number, number], direction: [number, number, number]);
    intersectSphere(center: [number, number, number], radius: number): number;
}
