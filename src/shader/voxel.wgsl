struct Uniforms {
  viewMatrix : mat4x4<f32>,
  projectionMatrix : mat4x4<f32>,
  modelMatrix : mat4x4<f32>,
  cameraPosition : vec4<f32>,
};

struct Voxel {
  position : vec4<f32>,
  color : vec4<f32>,
  textureIndices : vec4<u32>,
};

struct VoxelBuffer {
  voxels : array<Voxel>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<storage, read> voxelData : VoxelBuffer;
@group(0) @binding(2) var textureAtlas : texture_2d_array<f32>;
@group(0) @binding(3) var textureSampler : sampler;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) Color : vec4<f32>,
  @location(1) Normal : vec3<f32>,
  @location(2) WorldPos : vec3<f32>,
  @location(3) LocalPos : vec3<f32>,
  @location(4) Border : f32,
  @location(5) TexCoord : vec2<f32>,
  @location(6) TexIndex : f32,
};

// Cube vertices (positions and normals)
// 6 faces, 2 triangles per face, 3 vertices per triangle = 36 vertices
// Modified to be from 0.0 to 1.0 instead of -0.5 to 0.5
// Z-Up Coordinate System
var<private> cubeVertices : array<vec3<f32>, 36> = array<vec3<f32>, 36>(
  // Front face (y = 0.0)
  vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0),
  vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0),
  // Back face (y = 1.0)
  vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0),
  vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0),
  // Top face (z = 1.0)
  vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0),
  vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), vec3(0.0, 1.0, 1.0),
  // Bottom face (z = 0.0)
  vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0),
  vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0),
  // Right face (x = 1.0)
  vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0),
  vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0),
  // Left face (x = 0.0)
  vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0),
  vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0)
);

var<private> cubeNormals : array<vec3<f32>, 36> = array<vec3<f32>, 36>(
  // Front (y = 0.0) -> Normal -Y
  vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0),
  vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, -1.0, 0.0),
  // Back (y = 1.0) -> Normal +Y
  vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0),
  vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0),
  // Top (z = 1.0) -> Normal +Z
  vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0),
  vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0),
  // Bottom (z = 0.0) -> Normal -Z
  vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0),
  vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0),
  // Right (x = 1.0) -> Normal +X
  vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0),
  vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0),
  // Left (x = 0.0) -> Normal -X
  vec3(-1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0),
  vec3(-1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0)
);

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex : u32
) -> VertexOutput {
  let voxel = voxelData.voxels[instanceIndex];
  let position = cubeVertices[vertexIndex];
  let normal = cubeNormals[vertexIndex];
  
  let worldPosition = position + voxel.position.xyz;
  
  var output : VertexOutput;
  // Calculations on WebGPU: Projection * View * WorldPos
  output.Position = uniforms.projectionMatrix * uniforms.viewMatrix * vec4<f32>(worldPosition, 1.0);
  output.Color = voxel.color;
  output.Normal = normal;
  output.WorldPos = worldPosition;
  output.LocalPos = position;
  output.Border = voxel.position.w;

  // Determine face index (0-5)
  let faceIndex = vertexIndex / 6u;
  
  // Extract texture index
  var texIndex : u32 = 0u;
  if (faceIndex == 0u) { texIndex = voxel.textureIndices.x & 0xFFFFu; } // Front
  else if (faceIndex == 1u) { texIndex = voxel.textureIndices.x >> 16u; } // Back
  else if (faceIndex == 2u) { texIndex = voxel.textureIndices.y & 0xFFFFu; } // Top
  else if (faceIndex == 3u) { texIndex = voxel.textureIndices.y >> 16u; } // Bottom
  else if (faceIndex == 4u) { texIndex = voxel.textureIndices.z & 0xFFFFu; } // Right
  else if (faceIndex == 5u) { texIndex = voxel.textureIndices.z >> 16u; } // Left
  
  output.TexIndex = f32(texIndex);

  // Blur/Tint Logic
  let blurMask = voxel.textureIndices.w;
  let isBlurred = (blurMask >> faceIndex) & 1u;

  if (isBlurred == 0u) {
     // If not blurred, and we have a texture, use white to show texture as is.
     if (texIndex < 65534u) {
         output.Color = vec4<f32>(1.0, 1.0, 1.0, 1.0);
     } else {
         // No texture, use voxel color
         output.Color = voxel.color;
     }
  } else {
     // Blurred, use voxel color (tint)
     output.Color = voxel.color;
  }
  
  // Calculate UVs
  // position is 0..1
  var uv = vec2<f32>(0.0, 0.0);
  if (faceIndex == 0u) { uv = vec2(position.x, 1.0 - position.z); } // Front (Y=0)
  else if (faceIndex == 1u) { uv = vec2(1.0 - position.x, 1.0 - position.z); } // Back (Y=1)
  else if (faceIndex == 2u) { uv = vec2(position.x, 1.0 - position.y); } // Top (Z=1)
  else if (faceIndex == 3u) { uv = vec2(position.x, position.y); } // Bottom (Z=0)
  else if (faceIndex == 4u) { uv = vec2(position.y, 1.0 - position.z); } // Right (X=1)
  else if (faceIndex == 5u) { uv = vec2(1.0 - position.y, 1.0 - position.z); } // Left (X=0)
  
  output.TexCoord = uv;
  
  return output;
}

@fragment
fn fs_main(input : VertexOutput) -> @location(0) vec4<f32> {
  // Border logic
  if (input.Border > 0.5) {
    // LocalPos is now 0.0 to 1.0
    // We want distance from center (0.5, 0.5, 0.5)
    let centered = abs(input.LocalPos - vec3(0.5));
    
    // Find the second largest component to detect edges of the face
    let maxC = max(max(centered.x, centered.y), centered.z);
    let minC = min(min(centered.x, centered.y), centered.z);
    let sum = centered.x + centered.y + centered.z;
    let midC = sum - maxC - minC;
    
    // 0.5 is edge. 0.45 is border start.
    // We check midC because on a face, maxC is always 0.5.
    // If midC is also high, it means we are near an edge of that face.
    if (midC > 0.45) {
      return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
  }

  var baseColor = input.Color;

  // Check if texture is valid (0xFFFF = 65535)
  if (input.TexIndex < 65534.0) {
    let texColor = textureSampleLevel(textureAtlas, textureSampler, input.TexCoord, i32(input.TexIndex), 0.0);
    baseColor = texColor * input.Color;
  }

  // Simple directional lighting
  let lightDir = normalize(vec3<f32>(0.5, 0.8, 0.3));
  let ambient = 0.5;
  let diffuse = max(dot(input.Normal, lightDir), 0.0);
  let lighting = ambient + diffuse;
  
  let color = baseColor.rgb * lighting;
  return vec4<f32>(color, baseColor.a);
}
