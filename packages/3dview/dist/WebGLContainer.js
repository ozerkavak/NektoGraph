import { Mat4, Ray } from './utils/math';
import { createProgram } from './utils/shader';
import { VS_SOURCE, FS_SOURCE } from './shaders/standard';
import { BG_VS_SOURCE, BG_FS_SOURCE } from './shaders/background';
import { LINE_VS_SOURCE, LINE_FS_SOURCE } from './shaders/line';
import { CUBE_VERTICES, PYRAMID_VERTICES, SPHERE_VERTICES, INVERTED_PYRAMID_VERTICES } from './geometry/primitives';
export class WebGLContainer {
    canvas;
    gl = null;
    animationFrameId = null;
    options;
    // State
    isRunning = false;
    // Camera State
    cameraTheta = 0; // Horizontal orbit
    cameraPhi = Math.PI / 3;
    cameraRadius = 25;
    target = [0, 0, 0];
    startTime = Date.now();
    showEmptyProps = false;
    // Interaction State
    isDragging = false;
    lastMouseX = 0;
    lastMouseY = 0;
    hoverNodeId = null;
    capturedNodeId = null;
    viewMatrix = new Mat4();
    projMatrix = new Mat4();
    // WebGL Resources
    program = null;
    cubeVAO = null;
    pyramidVAO = null;
    sphereVAO = null;
    invertedPyramidVAO = null;
    // Background Resources
    bgProgram = null;
    bgVAO = null;
    bgCount = 0;
    // Line Resources
    lineProgram = null;
    lineVAO = null;
    lineBuffer = null;
    lineCount = 0;
    // Uniform Locations
    uProjection = null;
    uView = null;
    uTime = null;
    // Instance Data (CPU Side)
    instanceCount = { cube: 0, pyramid: 0, sphere: 0, inverted_pyramid: 0 };
    instanceBuffer = null;
    nodes = [];
    selectedNodeId = null;
    // Overlay
    overlay;
    labelElements = new Map();
    constructor(options) {
        this.options = options;
        // METHOD PINNING: Explicitly bind public methods to 'this' as properties.
        // This prevents minifiers (like Terser/Esbuild) from mangling these names
        // when they are accessed dynamically from outside (e.g., state.ts).
        this.mount = this.mount.bind(this);
        this.updateGraph = this.updateGraph.bind(this);
        this.destroy = this.destroy.bind(this);
        this.getNodeById = this.getNodeById.bind(this);
        this.getNodes = this.getNodes.bind(this);
        this.mount(options.container);
    }
    mount(container) {
        this.options.container = container;
        container.innerHTML = '';
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.display = 'block';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
        }
        container.appendChild(this.canvas);
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            Object.assign(this.overlay.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'hidden',
                fontFamily: 'sans-serif',
                fontSize: '12px',
                userSelect: 'none'
            });
            this.createControls();
        }
        container.appendChild(this.overlay);
        if (!this.gl) {
            const ctx = this.canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
            if (!ctx) {
                console.error('WebGL 2 not supported');
                return;
            }
            this.gl = ctx;
            this.setupInput();
            this.initGL();
            const resizeObserver = new ResizeObserver(() => this.onResize());
            resizeObserver.observe(this.canvas); // Observe canvas instead of container for stability
        }
        this.start();
        this.onResize();
    }
    createControls() {
        const controls = document.createElement('div');
        Object.assign(controls.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            pointerEvents: 'auto',
            display: 'flex',
            gap: '8px',
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.1)'
        });
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Show Empty Properties';
        Object.assign(toggleBtn.style, {
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
            opacity: '0.7'
        });
        toggleBtn.onclick = () => {
            this.showEmptyProps = !this.showEmptyProps;
            toggleBtn.textContent = this.showEmptyProps ? 'Hide Empty Properties' : 'Show Empty Properties';
            toggleBtn.style.opacity = this.showEmptyProps ? '1' : '0.7';
            if (this.options.onToggleEmptyProps) {
                this.options.onToggleEmptyProps(this.showEmptyProps);
            }
        };
        controls.appendChild(toggleBtn);
        this.overlay.appendChild(controls);
    }
    setupInput() {
        const el = this.options.container;
        el.addEventListener('pointerdown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.capturedNodeId = this.hoverNodeId;
            }
            else if (e.button === 2) {
                this.isDragging = true;
            }
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointerup', (e) => {
            this.isDragging = false;
            this.capturedNodeId = null;
            el.releasePointerCapture(e.pointerId);
            if (this.hoverNodeId && e.button === 0) {
                this.selectedNodeId = this.hoverNodeId;
                if (this.options.onNodeClick) {
                    this.options.onNodeClick(this.hoverNodeId, this);
                }
            }
            else if (e.button === 0) {
                this.selectedNodeId = null;
            }
        });
        el.addEventListener('pointermove', (e) => {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            if (this.isDragging) {
                if (e.buttons === 1) {
                    if (this.capturedNodeId) {
                        this.moveNode(this.capturedNodeId, dx, dy);
                    }
                    else {
                        const SENSITIVITY = 0.01;
                        this.cameraTheta -= dx * SENSITIVITY;
                        this.cameraPhi -= dy * SENSITIVITY;
                        this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));
                    }
                }
                else if (e.buttons === 2) {
                    this.pan(dx, dy);
                }
            }
            else {
                this.checkHover(e.clientX, e.clientY);
            }
        });
        el.addEventListener('dblclick', () => {
            if (this.hoverNodeId && this.options.onNodeClick) {
                this.options.onNodeClick(this.hoverNodeId, this);
            }
        });
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.checkHover(e.clientX, e.clientY);
            if (this.hoverNodeId && this.options.onNodeContextMenu) {
                this.options.onNodeContextMenu(this.hoverNodeId, e.clientX, e.clientY, this);
            }
        });
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraRadius += e.deltaY * 0.05;
            this.cameraRadius = Math.max(5, Math.min(100, this.cameraRadius));
        }, { passive: false });
    }
    moveNode(id, dx, dy) {
        const node = this.nodes.find(n => n.id === id);
        if (!node || !node.position)
            return;
        // Accurate screen-to-world movement
        const invVP = this.projMatrix.multiply(this.viewMatrix).invert();
        // Project current position to NDC
        const mvp = this.projMatrix.multiply(this.viewMatrix);
        const p = mvp.multiplyVec4([node.position[0], node.position[1], node.position[2], 1.0]);
        const ndcX = p[0] / p[3];
        const ndcY = p[1] / p[3];
        const ndcZ = p[2] / p[3];
        const rect = this.canvas.getBoundingClientRect();
        const nextNdcX = ndcX + (dx / rect.width) * 2;
        const nextNdcY = ndcY - (dy / rect.height) * 2;
        const pNew = invVP.multiplyVec4([nextNdcX, nextNdcY, ndcZ, 1.0]);
        node.position[0] = pNew[0] / pNew[3];
        node.position[1] = pNew[1] / pNew[3];
        node.position[2] = pNew[2] / pNew[3];
        this.syncGPUBuffer();
    }
    pan(dx, dy) {
        const scale = this.cameraRadius * 0.001;
        this.target[0] -= dx * scale * Math.cos(this.cameraTheta);
        this.target[2] += dx * scale * Math.sin(this.cameraTheta);
        this.target[1] += dy * scale;
    }
    checkHover(clientX, clientY) {
        if (!this.gl)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const ndcX = (x / rect.width) * 2 - 1;
        const ndcY = -((y / rect.height) * 2 - 1);
        const ray = this.getRayFromNDC(ndcX, ndcY);
        let minDist = Infinity;
        let hitId = null;
        this.nodes.forEach(node => {
            const pos = node.position || [0, 0, 0];
            const radius = (node.type === 'focus' ? 1.5 : 0.8) * 1.5;
            const dist = ray.intersectSphere(pos, radius);
            if (dist > 0 && dist < minDist) {
                minDist = dist;
                hitId = node.id;
            }
        });
        if (this.hoverNodeId !== hitId) {
            this.hoverNodeId = hitId;
            this.canvas.style.cursor = hitId ? 'pointer' : 'default';
        }
    }
    getRayFromNDC(ndcX, ndcY) {
        const invVP = this.projMatrix.multiply(this.viewMatrix).invert();
        const pNear = invVP.multiplyVec4([ndcX, ndcY, -1, 1]);
        const pFar = invVP.multiplyVec4([ndcX, ndcY, 1, 1]);
        const near3 = [pNear[0] / pNear[3], pNear[1] / pNear[3], pNear[2] / pNear[3]];
        const far3 = [pFar[0] / pFar[3], pFar[1] / pFar[3], pFar[2] / pFar[3]];
        const dir = [far3[0] - near3[0], far3[1] - near3[1], far3[2] - near3[2]];
        const len = Math.hypot(...dir);
        return new Ray(near3, [dir[0] / len, dir[1] / len, dir[2] / len]);
    }
    initGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.BLEND); // For smooth stars/lines
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.program = createProgram(gl, VS_SOURCE, FS_SOURCE);
        if (!this.program)
            return;
        this.uProjection = gl.getUniformLocation(this.program, 'u_projection');
        this.uView = gl.getUniformLocation(this.program, 'u_view');
        this.uTime = gl.getUniformLocation(this.program, 'u_time');
        this.instanceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 1000 * 7 * 4, gl.DYNAMIC_DRAW);
        this.cubeVAO = this.createMeshVAO(CUBE_VERTICES);
        this.pyramidVAO = this.createMeshVAO(PYRAMID_VERTICES);
        this.sphereVAO = this.createMeshVAO(SPHERE_VERTICES);
        this.invertedPyramidVAO = this.createMeshVAO(INVERTED_PYRAMID_VERTICES);
        // Line Resources
        this.lineProgram = createProgram(gl, LINE_VS_SOURCE, LINE_FS_SOURCE);
        this.lineBuffer = gl.createBuffer();
        this.lineVAO = gl.createVertexArray();
        gl.bindVertexArray(this.lineVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 1000 * 6 * 4, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0); // pos
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12); // color
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24); // progression
        gl.bindVertexArray(null);
        this.initBackground();
    }
    initBackground() {
        const gl = this.gl;
        this.bgProgram = createProgram(gl, BG_VS_SOURCE, BG_FS_SOURCE);
        if (!this.bgProgram)
            return;
        const starCount = 2000;
        this.bgCount = starCount;
        const starData = new Float32Array(starCount * 5);
        for (let i = 0; i < starCount; i++) {
            const idx = i * 5;
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = 50 + Math.random() * 50;
            starData[idx] = r * Math.sin(phi) * Math.cos(theta);
            starData[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
            starData[idx + 2] = r * Math.cos(phi);
            starData[idx + 3] = 1.0 + Math.random() * 2.0;
            starData[idx + 4] = 0.2 + Math.random() * 0.8;
        }
        this.bgVAO = gl.createVertexArray();
        gl.bindVertexArray(this.bgVAO);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);
        const stride = 5 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16);
        gl.bindVertexArray(null);
    }
    createMeshVAO(vertices) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const STRIDE = 6 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 3, gl.FLOAT, false, STRIDE, 12);
        gl.bindVertexArray(null);
        return vao;
    }
    setupInstanceAttributes(instanceOffset = 0) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        const stride = 7 * 4;
        const offset = instanceOffset * stride;
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, offset + 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, offset + 12);
        gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, offset + 24);
        gl.vertexAttribDivisor(3, 1);
    }
    updateGraph(data) {
        if (!this.gl || !this.instanceBuffer)
            return;
        // Stable Position Preservation
        const oldNodeMap = new Map(this.nodes.map(n => [n.id, n]));
        this.nodes = data.nodes.map(newNode => {
            const existing = oldNodeMap.get(newNode.id);
            if (existing && existing.position) {
                return { ...newNode, position: [...existing.position] };
            }
            return newNode;
        });
        this.overlay.innerHTML = '';
        this.labelElements.clear();
        this.nodes.forEach(node => {
            const el = document.createElement('div');
            el.textContent = node.label;
            Object.assign(el.style, {
                position: 'absolute',
                color: node.type === 'focus' ? '#ffffff' : '#f8f8f8',
                padding: '5px 12px',
                background: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                whiteSpace: 'nowrap',
                transform: 'translate(-50%, -100%)',
                display: 'none',
                fontWeight: node.type === 'focus' ? '600' : '500',
                fontSize: node.type === 'focus' ? '14px' : '11px',
                letterSpacing: '0.2px',
                zIndex: node.type === 'focus' ? '10' : '1',
                boxShadow: '0 4px 20px rgba(0,0,0,0.85)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: 'none'
            });
            this.overlay.appendChild(el);
            this.labelElements.set(node.id, el);
        });
        this.syncGPUBuffer();
        this.render();
    }
    syncGPUBuffer() {
        if (!this.gl || !this.instanceBuffer || !this.lineBuffer)
            return;
        const gl = this.gl;
        // Group nodes by shape
        const cubes = this.nodes.filter(n => n.shape === 'cube' || !n.shape);
        const pyramids = this.nodes.filter(n => n.shape === 'pyramid');
        const spheres = this.nodes.filter(n => n.shape === 'sphere');
        const invertedPyramids = this.nodes.filter(n => n.shape === 'inverted_pyramid');
        const sortedNodes = [...cubes, ...pyramids, ...spheres, ...invertedPyramids];
        const raw = new Float32Array(sortedNodes.length * 7);
        sortedNodes.forEach((node, i) => {
            const idx = i * 7;
            const pos = node.position || [0, 0, 0];
            raw[idx + 0] = pos[0];
            raw[idx + 1] = pos[1];
            raw[idx + 2] = pos[2];
            let r = 1, g = 1, b = 1;
            if (node.color && node.color.startsWith('#')) {
                const hex = node.color.substring(1);
                r = parseInt(hex.substring(0, 2), 16) / 255;
                g = parseInt(hex.substring(2, 4), 16) / 255;
                b = parseInt(hex.substring(4, 6), 16) / 255;
            }
            // Highlight selected node
            if (node.id === this.selectedNodeId) {
                r = Math.min(1, r + 0.5);
                g = Math.min(1, g + 0.5);
                b = Math.min(1, b + 0.5);
            }
            raw[idx + 3] = r;
            raw[idx + 4] = g;
            raw[idx + 5] = b;
            // Scaled Points for Data Values
            let scale = node.type === 'focus' ? 3.0 : 0.8;
            if (node.type === 'value' && node.isData) {
                scale = 0.15;
            }
            raw[idx + 6] = scale * (node.id === this.selectedNodeId ? 1.2 : 1.0);
        });
        this.instanceCount = { cube: cubes.length, pyramid: pyramids.length, sphere: spheres.length, inverted_pyramid: invertedPyramids.length };
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, raw);
        // Generate Edges
        const edges = [];
        this.nodes.forEach(node => {
            if (node.neighbors) {
                node.neighbors.forEach(edgeObj => {
                    const target = this.nodes.find(n => n.id === edgeObj.targetId);
                    if (target) {
                        const isSelected = node.id === this.selectedNodeId || target.id === this.selectedNodeId;
                        const r = isSelected ? 1 : 0.4;
                        const g = isSelected ? 1 : 0.4;
                        const b = isSelected ? 1 : 0.4;
                        edges.push(...(node.position || [0, 0, 0]), r, g, b, 0.0);
                        edges.push(...(target.position || [0, 0, 0]), r, g, b, 1.0);
                    }
                });
            }
        });
        this.lineCount = edges.length / 7;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(edges));
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.loop();
    }
    loop() {
        if (!this.isRunning || !this.gl)
            return;
        this.render();
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
    render() {
        const gl = this.gl;
        if (!this.program || !this.cubeVAO)
            return;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const aspect = this.canvas.width / this.canvas.height;
        const projection = Mat4.perspective(Math.PI / 4, aspect, 0.1, 200);
        const camX = this.target[0] + this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
        const camY = this.target[1] + this.cameraRadius * Math.cos(this.cameraPhi);
        const camZ = this.target[2] + this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
        const view = Mat4.lookAt([camX, camY, camZ], this.target, [0, 1, 0]);
        this.viewMatrix = view;
        this.projMatrix = projection;
        this.renderBackground(projection, view);
        gl.useProgram(this.program);
        if (this.uProjection)
            gl.uniformMatrix4fv(this.uProjection, false, projection.data);
        if (this.uView)
            gl.uniformMatrix4fv(this.uView, false, view.data);
        if (this.uTime)
            gl.uniform1f(this.uTime, (Date.now() - this.startTime) / 1000.0);
        // Draw Cubes
        if (this.instanceCount.cube > 0) {
            gl.bindVertexArray(this.cubeVAO);
            this.setupInstanceAttributes(0);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.instanceCount.cube);
        }
        // Draw Pyramids
        if (this.instanceCount.pyramid > 0) {
            gl.bindVertexArray(this.pyramidVAO);
            this.setupInstanceAttributes(this.instanceCount.cube);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 18, this.instanceCount.pyramid);
        }
        // Draw Spheres
        if (this.instanceCount.sphere > 0) {
            gl.bindVertexArray(this.sphereVAO);
            this.setupInstanceAttributes(this.instanceCount.cube + this.instanceCount.pyramid);
            // 12x12 bands = 144 quads = 288 triangles = 864 vertices
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 864, this.instanceCount.sphere);
        }
        // Draw Inverted Pyramids
        if (this.instanceCount.inverted_pyramid > 0) {
            gl.bindVertexArray(this.invertedPyramidVAO);
            this.setupInstanceAttributes(this.instanceCount.cube + this.instanceCount.pyramid + this.instanceCount.sphere);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 18, this.instanceCount.inverted_pyramid);
        }
        this.renderEdges(projection, view);
        this.updateLabels(projection.multiply(view));
    }
    updateLabels(mvp) {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.nodes.forEach(node => {
            const el = this.labelElements.get(node.id);
            if (!el)
                return;
            const pos = node.position || [0, 0, 0];
            const d = mvp.data;
            const labelYOffset = node.type === 'focus' ? 1.0 : 0.6;
            const x = pos[0], y = pos[1] + labelYOffset, z = pos[2], w = 1.0;
            const _x = d[0] * x + d[4] * y + d[8] * z + d[12] * w;
            const _y = d[1] * x + d[5] * y + d[9] * z + d[13] * w;
            const _w = d[3] * x + d[7] * y + d[11] * z + d[15] * w;
            if (_w <= 0) {
                el.style.display = 'none';
                return;
            }
            // Calculate distance for fading
            const camX = this.target[0] + this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
            const camY = this.target[1] + this.cameraRadius * Math.cos(this.cameraPhi);
            const camZ = this.target[2] + this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
            const dx = pos[0] - camX;
            const dy = pos[1] - camY;
            const dz = pos[2] - camZ;
            const distToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const ndcX = _x / _w;
            const ndcY = _y / _w;
            const screenX = (ndcX + 1) * width / 2;
            const screenY = (1 - ndcY) * height / 2;
            if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) {
                el.style.display = 'none';
                return;
            }
            el.style.display = 'block';
            el.style.left = `${screenX}px`;
            el.style.top = `${screenY}px`;
            // Proximity Fading (Galaxy Effect)
            const maxDist = 40;
            const opacity = Math.max(0, 1.0 - (distToCamera / maxDist));
            el.style.opacity = String(opacity);
            el.style.transform = `translate(-50%, -100%) scale(${0.8 + opacity * 0.2})`;
        });
    }
    renderBackground(projection, view) {
        if (!this.bgProgram || !this.bgVAO)
            return;
        const gl = this.gl;
        gl.useProgram(this.bgProgram);
        const locProj = gl.getUniformLocation(this.bgProgram, 'u_projection');
        const locView = gl.getUniformLocation(this.bgProgram, 'u_view');
        if (locProj)
            gl.uniformMatrix4fv(locProj, false, projection.data);
        if (locView)
            gl.uniformMatrix4fv(locView, false, view.data);
        gl.bindVertexArray(this.bgVAO);
        gl.depthMask(false);
        gl.drawArrays(gl.POINTS, 0, this.bgCount);
        gl.depthMask(true);
    }
    renderEdges(projection, view) {
        if (!this.lineProgram || !this.lineVAO || this.lineCount === 0)
            return;
        const gl = this.gl;
        gl.useProgram(this.lineProgram);
        const locProj = gl.getUniformLocation(this.lineProgram, 'u_projection');
        const locView = gl.getUniformLocation(this.lineProgram, 'u_view');
        const locOpacity = gl.getUniformLocation(this.lineProgram, 'u_opacity');
        if (locProj)
            gl.uniformMatrix4fv(locProj, false, projection.data);
        if (locView)
            gl.uniformMatrix4fv(locView, false, view.data);
        if (locOpacity)
            gl.uniform1f(locOpacity, 0.6);
        const locTime = gl.getUniformLocation(this.lineProgram, 'u_time');
        if (locTime)
            gl.uniform1f(locTime, (Date.now() - this.startTime) / 1000.0);
        gl.bindVertexArray(this.lineVAO);
        gl.drawArrays(gl.LINES, 0, this.lineCount);
        gl.bindVertexArray(null);
    }
    onResize() {
        if (!this.canvas)
            return;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.options.container.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.render();
    }
    destroy() {
        this.isRunning = false;
        if (this.animationFrameId)
            cancelAnimationFrame(this.animationFrameId);
    }
    getNodeById(id) {
        return this.nodes.find(n => n.id === id);
    }
    getNodes() {
        return this.nodes;
    }
}
