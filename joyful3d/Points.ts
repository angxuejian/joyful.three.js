import * as THREE from 'three'

export interface PointsOptionsType {
  scene?: THREE.Scene
  maxPoints?: number
  // decayTime?: number
  alpha?: boolean
}

export default class Points {
  private maxPoints: number
  // private decayTime: number
  private alpha: boolean
  private colorLength: number
  private currentIndex = 0

  private scene: THREE.Scene | undefined
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.Material
  // private timestamps: Float64Array

  constructor(private options: PointsOptionsType = {}) {
    this.maxPoints = this.options.maxPoints || 1000
    // this.decayTime = this.options.decayTime || 1000
    this.alpha = this.options.alpha || false
    this.colorLength = this.alpha ? 4 : 3
    this.scene = this.options.scene

    this.geometry = new THREE.BufferGeometry()
    // this.timestamps = new Float64Array(this.maxPoints)

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

    // this.timestamps[i] = Date.now()

    this.currentIndex++
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true

    const drawCount = Math.min(this.currentIndex, this.maxPoints)
    this.geometry.setDrawRange(0, drawCount)
  }

  // public updatePoint() {
  //   const now = Date.now()

  //   const length = Math.min(this.currentIndex, this.maxPoints)

  //   const decayAlpha = (dt: number) => 1.0 - Math.min(dt / this.decayTime, 1.0)

  //   for (let i = 0; i < length; i++) {
  //     const age = now - this.timestamps[i]

  //     if (this.alpha) {
  //       this.geometry.attributes.color.array[i * this.colorLength + 3] = decayAlpha(age)
  //     } else {
  //       if (age > this.decayTime) {
  //         this.geometry.attributes.color.array[i * 3] = 0
  //         this.geometry.attributes.color.array[i * 3 + 1] = 0
  //         this.geometry.attributes.color.array[i * 3 + 2] = 0
  //       }
  //     }
  //   }

  //   this.geometry.attributes.color.needsUpdate = true
  // }

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
