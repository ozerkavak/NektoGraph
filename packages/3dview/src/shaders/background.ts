export const BG_VS_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in float a_size;
layout(location = 2) in float a_brightness;

uniform mat4 u_projection;
uniform mat4 u_view;

out float v_brightness;

void main() {
    gl_Position = u_projection * u_view * vec4(a_position, 1.0);
    gl_PointSize = a_size;
    v_brightness = a_brightness;
}
`;

export const BG_FS_SOURCE = `#version 300 es
precision mediump float;

in float v_brightness;
out vec4 outColor;

void main() {
    // Soft round point with Gaussian falloff
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.2, d);
    if(alpha <= 0.0) discard;
    
    outColor = vec4(0.8, 0.9, 1.0, v_brightness * 0.4 * alpha);
}
`;
