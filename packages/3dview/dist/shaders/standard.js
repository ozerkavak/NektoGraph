export const VS_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_offset;
layout(location = 2) in vec3 a_color;
layout(location = 3) in float a_scale;
layout(location = 4) in vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_view;

out vec3 v_color;
out vec3 v_normal;
out vec3 v_viewDir;
out float v_dist;

void main() {
    vec3 worldPos = a_position * a_scale + a_offset;
    vec4 viewPos = u_view * vec4(worldPos, 1.0);
    gl_Position = u_projection * viewPos;
    
    v_color = a_color;
    v_normal = normalize(a_normal); // Simplified for uniform scale
    v_viewDir = normalize(-viewPos.xyz);
    v_dist = length(viewPos.xyz);
}
`;
export const FS_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_color;
in vec3 v_normal;
in vec3 v_viewDir;
in float v_dist;

uniform float u_time;

out vec4 outColor;

void main() {
    const vec3 fogColor = vec3(0.0, 0.0, 0.0); 
    const float fogDensity = 0.01;

    // 1. Lighting (Lambertian + Ambient)
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(v_normal, lightDir), 0.0);
    vec3 ambient = v_color * 0.2;
    vec3 diffuse = v_color * diff * 0.8;
    
    // 2. Fresnel Rim Lighting
    float fresnel = pow(1.0 - max(dot(v_normal, v_viewDir), 0.0), 3.0);
    vec3 rimColor = v_color * 0.8;
    
    // 3. Emissive Pulse
    float pulse = 0.9 + 0.1 * sin(u_time * 2.0);
    vec3 shadedColor = (ambient + diffuse) * pulse;

    // Combine
    vec3 color = shadedColor + (rimColor * fresnel * 1.5);

    // 4. Fog
    float fogFactor = exp(-fogDensity * v_dist);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    vec3 finalColor = mix(fogColor, color, fogFactor);
    outColor = vec4(finalColor, 1.0);
}
`;
