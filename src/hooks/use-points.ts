import * as THREE from 'three'
import { onMounted } from 'vue'

/**
 * 使用点云图
 * @param param.add scene.add 方法
 * @param param.maxPoints THREE.Points对象容器，最大承受的点云数量，默认为1000点
 * @param param.alpha 点云颜色是否可透明，默认false
 * @param param.decayTime 点云衰减时间，并不会移除，alpha = true时会透明化，默认1_000ms，使用update()后 才会生效
 * @returns
 */
export function usePoints({
  add,
  maxPoints = 1000,
  decayTime = 1_000,
  alpha = false,
}: {
  add: (obj: THREE.Object3D) => void
  maxPoints?: number
  decayTime?: number
  alpha?: boolean
}) {
  const geometry = new THREE.BufferGeometry()
  const timestamps = new Float64Array(maxPoints)
  const colorLength = alpha ? 4 : 3

  let material: THREE.Material

  let currentIndex = 0

  const init = () => {
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(maxPoints * 3), 3),
    )

    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(new Float32Array(maxPoints * colorLength), colorLength),
    )
    geometry.computeBoundingSphere()

    if (alpha) {
      material = new THREE.ShaderMaterial({
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
      material = new THREE.PointsMaterial({ size: 0.5, vertexColors: true })
    }

    const points = new THREE.Points(geometry, material)

    add(points)

    currentIndex = 0
  }

  const addPoint = (x: number, y: number, z: number, r: number, g: number, b: number) => {
    const i = currentIndex % maxPoints

    geometry.attributes.position.array[i * 3] = x
    geometry.attributes.position.array[i * 3 + 1] = y
    geometry.attributes.position.array[i * 3 + 2] = z

    geometry.attributes.color.array[i * colorLength] = r
    geometry.attributes.color.array[i * colorLength + 1] = g
    geometry.attributes.color.array[i * colorLength + 2] = b
    if (alpha) {
      geometry.attributes.color.array[i * colorLength + 3] = 1
    }

    timestamps[i] = Date.now()

    currentIndex++
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true

    const drawCount = Math.min(currentIndex, maxPoints)
    geometry.setDrawRange(0, drawCount)
  }

  const update = () => {
    const now = Date.now()

    const alphaDecay = (dt: number) => 1.0 - Math.min(dt / decayTime, 1.0)

    const length = Math.min(currentIndex, maxPoints)
    for (let i = 0; i < length; i++) {
      const age = now - timestamps[i]

      if (alpha) {
        const alpha = alphaDecay(age)
        geometry.attributes.color.array[i * colorLength + 3] = alpha
      } else {
        if (age > decayTime) {
          geometry.attributes.color.array[i * 3] = 0
          geometry.attributes.color.array[i * 3 + 1] = 0
          geometry.attributes.color.array[i * 3 + 2] = 0
        }
      }
    }

    geometry.attributes.color.needsUpdate = true
  }

  onMounted(() => {
    init()
  })

  return { addPoint, update }
}
