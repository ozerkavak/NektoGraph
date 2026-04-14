export const LINE_VS_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;
layout(location = 2) in float a_progression;

uniform mat4 u_projection;
uniform mat4 u_view;

out vec3 v_color;
out float v_prog;
out float v_dist;

void main() {
    vec4 viewPos = u_view * vec4(a_position, 1.0);
    gl_Position = u_projection * viewPos;
    v_color = a_color;
    v_prog = a_progression;
    v_dist = length(viewPos.xyz);
}
`;

export const LINE_FS_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_color;
in float v_prog;
in float v_dist;

uniform float u_opacity;
uniform float u_time;

out vec4 outColor;

void main() {
    const float fogDensity = 0.01;
    float fogFactor = exp(-fogDensity * v_dist);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    // Scrolling Flow Effect
    float flow = fract(v_prog - u_time * 0.5);
    float glow = smoothstep(0.8, 1.0, 1.0 - abs(flow - 0.5) * 2.0);
    
    vec3 finalColor = v_color + (vec3(1.0) * glow * 0.5);
    outColor = vec4(finalColor, u_opacity * fogFactor * (0.3 + glow * 0.7));
}
`;
