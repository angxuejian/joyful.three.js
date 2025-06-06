import * as THREE from 'three'

export interface PointsOptionsType {
  scene?: THREE.Scene
  maxPoints?: number
  alpha?: boolean
}

/**
 * Points 点云渲染类
 *
 * 用于在 THREE.js 场景中高效批量渲染点云数据，支持颜色和透明度设置。
 *
 * 主要功能：
 * - 支持最大点数限制，循环复用缓冲区，提升性能
 * - 支持 RGB 或 RGBA 颜色（可选 alpha 通道）
 * - 支持自定义点大小和透明度
 * - 提供 addPoint 方法动态添加点
 * - 提供 dispose 方法释放资源
 *
 * 构造参数 PointsOptionsType:
 * @param scene      THREE.Scene 实例，点云会自动添加到该场景
 * @param maxPoints  最大点数，超出后循环覆盖，默认 1000
 * @param alpha      是否启用 alpha 通道，默认 false
 */
export default class Points {
  private maxPoints: number
  private alpha: boolean
  private colorLength: number
  private currentIndex = 0

  private scene: THREE.Scene | undefined
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.Material

  constructor(private options: PointsOptionsType = {}) {
    this.maxPoints = this.options.maxPoints || 1000
    this.alpha = this.options.alpha || false
    this.colorLength = this.alpha ? 4 : 3
    this.scene = this.options.scene

    this.geometry = new THREE.BufferGeometry()

    this.material = this.createMaterial()
    this.initGeometry()
    this.points = new THREE.Points(this.geometry, this.material)
    this.scene?.add(this.points)
  }

  private createMaterial(): THREE.Material {
    if (this.alpha) {
      return new THREE.ShaderMaterial({
        transparent: true,
        depthTest: true,
        vertexColors: true,
        uniforms: {
          pointSize: { value: 0.5 },
          screenHeight: { value: window.innerHeight },
        },
        vertexShader: `
          varying vec4 vColor;
          uniform float pointSize;
          uniform float screenHeight;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = pointSize * (screenHeight / -mvPosition.z);
          }
        `,
        fragmentShader: `
          varying vec4 vColor;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            if (length(uv) > 0.5) discard;
            gl_FragColor = vColor;
          }
        `,
      })
    } else {
      return new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
      })
    }
  }

  private initGeometry() {
    const positionArray = new Float32Array(this.maxPoints * 3)
    const colorArray = new Float32Array(this.maxPoints * this.colorLength)

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3))
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, this.colorLength))
    this.geometry.computeBoundingSphere()
  }

  public getPoint() {
    return this.points
  }

  public addPoint(x: number, y: number, z: number, r: number, g: number, b: number) {
    const i = this.currentIndex % this.maxPoints
    this.geometry.attributes.position.array[i * 3] = x
    this.geometry.attributes.position.array[i * 3 + 1] = y
    this.geometry.attributes.position.array[i * 3 + 2] = z

    this.geometry.attributes.color.array[i * this.colorLength] = r
    this.geometry.attributes.color.array[i * this.colorLength + 1] = g
    this.geometry.attributes.color.array[i * this.colorLength + 2] = b

    if (this.alpha) {
      this.geometry.attributes.color.array[i * this.colorLength + 3] = 1
    }

    this.currentIndex++
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true

    const drawCount = Math.min(this.currentIndex, this.maxPoints)
    this.geometry.setDrawRange(0, drawCount)
  }

  public dispose() {
    if (this.scene) {
      this.scene.remove(this.points)
    }

    if (this.points.geometry) {
      this.points.geometry.dispose()
    }

    if (Array.isArray(this.points.material)) {
      this.points.material.forEach(m => m.dispose());
    } else {
      this.points.material.dispose();
    }
  }
}
