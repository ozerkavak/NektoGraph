export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertSource: string, fragSource: string): WebGLProgram | null {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);

    if (!vert || !frag) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program Link Error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}
