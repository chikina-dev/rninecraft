export type color = string | { r: number; g: number; b: number };

export interface ImgSettings {
  src: string;
  blur?: boolean;
}

export interface TextureMap {
  all?: ImgSettings;
  top?: ImgSettings;
  bottom?: ImgSettings;
  left?: ImgSettings;
  right?: ImgSettings;
  front?: ImgSettings;
  back?: ImgSettings;
  side?: ImgSettings;
}

export interface StyleObject {
  backgroundColor?: string;
  color?: string;
  textures?: TextureMap;
  [key: string]: any;
}

export interface VNode {
  type: string | Function;
  props: any;
  children: VNode[];
  key?: string | number;
}

export interface VoxelProps {
  x: number;
  y: number;
  z: number;
  color: color;
  border?: boolean;
  key?: string | number;
  textures?: TextureMap;
}

export interface CameraProviderProps {
  position: [number, number, number];
  target: [number, number, number];
}

export namespace JSX {
  export interface IntrinsicElements {
    voxel: VoxelProps;
    'camera-provider': CameraProviderProps;
  }
  export interface Element extends VNode {}
}
