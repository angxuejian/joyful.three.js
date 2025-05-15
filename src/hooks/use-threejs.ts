import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { type Ref, onMounted, onUnmounted } from 'vue'

/**
 * 使用Threejs
 * @param param.elRef dom的Ref对象
 * @param param.axis 是否显示坐标系
 * @param param.stats 是否显示监视器，可显示帧率
 * @param param.grid 是否显示网格助手
 * @returns
 */
export function useThreejs({
  elRef,
  axis = false,
  stats = false,
  grid = false,
}: {
  elRef: Ref
  axis?: boolean
  stats?: boolean
  grid?: boolean
}) {
  let width: number
  let height: number
  let requestId: number | null = null
  let destroy: boolean = false
  let observer: ResizeObserver | null = null

  let scene: THREE.Scene | null = null // 场景容器
  let camera: THREE.PerspectiveCamera | null = null // 透视相机
  let renderer: THREE.WebGLRenderer | null = null // 渲染器, 渲染到canvas上输出3D图像
  let controls: OrbitControls | null = null // 交互工具, 允许你用鼠标或触控操作相机, 环绕目标旋转、缩放、平移等交互, 还有其他交互工具FlyControls、PointerLockControls

  let _stats: Stats // 性能监控工具

  onMounted(() => {
    width = elRef && elRef.value.clientWidth
    height = elRef && elRef.value.clientHeight

    initScene()
    initCamera()
    initRenderer()
    initControl()

    startAnimationFrame()
    resizeObserver()

    if (axis) addAxis()
    if (stats) addState()
    if (grid) addGrid()
  })

  onUnmounted(() => {
    dispose()
  })

  /**
   * 初始化 threejs 场景容器
   */
  const initScene = () => {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xcccccc)
  }

  /**
   * 初始化 threejs 相机，并使用透视相机
   */
  const initCamera = () => {
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    setCameraPosition(10, 10, 10)
  }

  /**
   * 初始化 渲染器，并添加到dom节点上
   */
  const initRenderer = () => {
    renderer = new THREE.WebGLRenderer({
      precision: 'mediump', // 着色器精度.
      antialias: true, // 是否执行抗锯齿。默认为false.
      alpha: true
    })

    elRef.value.appendChild(renderer.domElement)

    // 设置domElement的尺寸
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
  }

  /**
   * 初始化 控制器
   */
  const initControl = () => {
    if (camera && renderer) {
      controls = new OrbitControls(camera, renderer.domElement)
    }
  }

  /**
   * 监听ref resize事件
   */
  const resizeObserver = () => {
    let resizeTimeout: number | null = null

    observer = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      resizeTimeout = setTimeout(() => {
        if (camera && renderer) {
          width = elRef.value.clientWidth
          height = elRef.value.clientHeight

          camera.aspect = width / height // 摄像机视锥体的长宽比, 通常是使用画布的宽/画布的高
          camera.updateProjectionMatrix() // 更新摄像机投影矩阵, 在任何参数被改变以后必须被调用, 来使得这些改变生效
          renderer.setSize(width, height)
          renderer.setPixelRatio(window.devicePixelRatio)
        }
      }, 200)
    })

    observer.observe(elRef.value)
  }

  /**
   * 销毁 threejs 实例
   */
  const dispose = () => {
    destroy = true

    cancelAnimationFrame()

    if (observer) {
      observer.disconnect()
    }

    if (_stats) {
      document.body.removeChild(_stats.dom)
    }

    if (scene && renderer && controls) {
      scene.traverse((object: any) => {
        // 释放几何体
        if (object.geometry && object.geometry.dispose === 'function') {
          object.geometry.dispose()
        }

        // 释放材质
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: THREE.Material) => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      // 释放 mesh、line、point等对象
      scene.clear()

      const canvas = renderer.domElement
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }

      renderer.dispose()
      controls.dispose()
    }

    scene = null
    camera = null
    controls = null
    renderer = null
    observer = null
    console.log(scene, camera, controls, renderer, observer, requestId)
  }

  /**
   * 辅助线助手
   */
  const addAxis = () => {
    if (scene === null) return

    const axis = new THREE.AxesHelper(100)
    scene.add(axis)
  }

  /**
   * 监视器助手
   */
  const addState = () => {
    _stats = new Stats()

    //  0:fps, 1: ms, 2: mb, 3+: custom
    _stats.showPanel(0)
    _stats.dom.style.position = 'fixed'
    _stats.dom.style.right = '0px'
    _stats.dom.style.top = '0px'
    document.body.appendChild(_stats.dom)
  }

  /**
   * 网格助手
   */
  const addGrid = () => {
    if (scene === null) return

    const grid = new THREE.GridHelper(15, 10)
    scene.add(grid)
  }

  /**
   * 执行动画帧
   */
  const startAnimationFrame = () => {
    if (!requestId) {
      destroy = false
      runAnimationFrame()
    }
  }

  /**
   * 循环动画帧
   */
  const runAnimationFrame = () => {
    if (destroy) return

    if (controls && renderer && scene && camera) {
      controls.update()
      renderer.render(scene, camera)

      if (_stats) _stats.update()

      requestId = window.requestAnimationFrame(runAnimationFrame)
    }
  }

  /**
   * 关闭动画帧
   */
  const cancelAnimationFrame = () => {
    if (!requestId) return
    window.cancelAnimationFrame(requestId)
    requestId = null
  }

  /**
   * 设置 相机位置
   */
  const setCameraPosition = (x: number, y: number, z: number) => {
    if (camera === null) return

    camera.position.set(x, y, z) // 相机放在(x, y, z)
    camera.lookAt(0, 0, 0) // 看向原点

    // camera 会从 (x, y, z) 这个位置看向 (0, 0, 0)，就像你站在高处看地面中心
  }

  /**
   * 在3d场景中, 添加对象
   * @param obj THREE.Object3D 对象
   */
  const add = (obj: THREE.Object3D) => {
    if (scene) {
      scene.add(obj)
    }
  }

  return { startAnimationFrame, cancelAnimationFrame, setCameraPosition, add }
}
