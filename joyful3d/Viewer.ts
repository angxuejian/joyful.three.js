import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

export interface ViewerOptionsType {
  el: HTMLElement // dom的Ref对象
  axis?: boolean // 是否显示坐标系
  stats?: boolean // 是否显示监视器，可显示帧率
  grid?: boolean // 是否显示网格助手
}

export default class Viewer {
  private width: number
  private height: number
  private destroy = false
  private requestId: number | null = null
  private observer: ResizeObserver | null = null

  private scene: THREE.Scene | null = null // 场景容器
  private camera: THREE.PerspectiveCamera | null = null // 透视相机
  private renderer: THREE.WebGLRenderer | null = null // 渲染器, 渲染到canvas上输出3D图像
  private controls: OrbitControls | null = null // 交互工具, 允许你用鼠标或触控操作相机, 环绕目标旋转、缩放、平移等交互, 还有其他交互工具FlyControls、PointerLockControls
  private stats: Stats | null = null // 性能监控工具

  constructor(private options: ViewerOptionsType) {
    this.width = this.options.el.clientWidth
    this.height = this.options.el.clientHeight

    this.init()
  }

  private init() {
    this.initScene()
    this.initCamera()
    this.initRenderer()
    this.initControls()
    this.observeResize()

    if (this.options.axis) this.addAxis()
    if (this.options.stats) this.addStats()
    if (this.options.grid) this.addGrid()

    this.start()
  }

  /**
   * 初始化 threejs 场景容器
   */
  private initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xcccccc)
  }

  /**
   * 初始化 threejs 相机，并使用透视相机
   */
  private initCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.setCameraPosition(10, 10, 10)
  }

  /**
   * 初始化 渲染器，并添加到dom节点上
   */
  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      precision: 'mediump', // 着色器精度
      antialias: true, // 是否执行抗锯齿。默认为false
      alpha: true,
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.options.el.appendChild(this.renderer.domElement)
  }

  /**
   * 初始化 控制器
   */
  private initControls() {
    if (this.camera && this.renderer) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    }
  }

  /**
   * 监听options.el resize事件
   */
  private observeResize() {
    this.observer = new ResizeObserver(() => {
      this.resize()
    })
    this.observer.observe(this.options.el)
  }

  /**
   * 更新尺寸
   */
  private resize() {
    if (this.camera && this.renderer) {
      this.width = this.options.el.clientWidth
      this.height = this.options.el.clientHeight
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(window.devicePixelRatio)
    }
  }

  private run() {
    if (this.destroy) return

    if (this.controls) this.controls.update()
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }

    if (this.stats) this.stats.update()

    this.requestId = window.requestAnimationFrame(() => this.run())
  }

  /**
   * 添加坐标辅助线
   */
  private addAxis() {
    if (this.scene) {
      const axis = new THREE.AxesHelper(100)
      this.scene.add(axis)
    }
  }

  /**
   * 添加监视器
   */
  private addStats() {
    this.stats = new Stats()
    this.stats.showPanel(0) // 0:fps, 1: ms, 2: mb, 3+: custom
    this.stats.dom.style.position = 'fixed'
    this.stats.dom.style.right = '0'
    this.stats.dom.style.top = '0'
    document.body.appendChild(this.stats.dom)
  }

  /**
   * 添加网格
   */
  private addGrid() {
    if (this.scene) {
      const grid = new THREE.GridHelper(15, 10)
      this.scene.add(grid)
    }
  }

  /**
   * 设置 相机位置
   */
  public setCameraPosition(x: number, y: number, z: number) {
    if (this.camera) {
      this.camera.position.set(x, y, z)
      this.camera.lookAt(0, 0, 0)
    }
  }


  public add(obj: THREE.Object3D) {
    this.scene?.add(obj)
  }

  public start() {
    if (!this.requestId) {
      this.destroy = false
      this.run()
    }
  }

  public stop() {
    if (this.requestId) {
      window.cancelAnimationFrame(this.requestId)
      this.requestId = null
    }
  }

  /**
   * 销毁 threejs 实例
   */
  public dispose() {
    this.destroy = true
    this.stop()

    this.observer?.disconnect()
    this.observer = null

    if (this.stats) {
      document.body.removeChild(this.stats.dom)
      this.stats = null
    }

    if (this.scene) {
      this.scene.traverse((obj: any) => {
        obj.geometry?.dispose?.()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose())
        } else {
          obj.material?.dispose?.()
        }
      })
      this.scene.clear()
    }

    const canvas = this.renderer?.domElement
    canvas?.parentNode?.removeChild(canvas)

    this.renderer?.dispose()
    this.controls?.dispose()

    this.scene = null
    this.camera = null
    this.controls = null
    this.renderer = null
  }

  public getCamera() {
    return this.camera
  }

  public getRenderer() {
    return this.renderer
  }

  public getScene() {
    return this.scene
  }
}
