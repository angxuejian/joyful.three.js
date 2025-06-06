import * as THREE from 'three'
import { onMounted, onUnmounted, type Ref } from 'vue'
import * as JOYFUL3D from '@joyful3d'

interface pointType {
  x: number
  y: number
  z: number
}

/**
 * 使用点云可视化的自定义 Hook。
 *
 * 功能说明：
 * - 自动初始化 JOYFUL3D.Viewer，并将点云渲染到指定的 DOM 元素上。
 * - 按指定速率（throttleRate）批量生成点云数据，并加入渲染队列。
 * - 点云数据会在指定衰减时间（decayTime）后自动销毁，避免内存泄漏。
 * - 支持最大点数限制（maxPoints），防止渲染压力过大。
 *
 * @param el           绑定的 DOM 元素 Ref
 * @param throttleRate 点云渲染的节流间隔（毫秒），默认 100
 * @param decayTime    点云的衰减时间（毫秒），默认 5000
 * @param maxPoints    每批次最大点数，默认 2000
 */
export function usePointCloud2({
  el,
  throttleRate = 100,
  decayTime = 5000,
  maxPoints = 2000,
}: {
  el: Ref
  throttleRate?: number
  decayTime?: number
  maxPoints?: number
}) {
  let index = 0
  let lastRenderTime = 0

  const max = 20000

  const pointCloudQueue: pointType[][] = []
  const pointInstanceArray: { instance: JOYFUL3D.Points; timestamps: number }[] = []

  let viewer: JOYFUL3D.Viewer
  let scene: THREE.Scene | undefined

  onMounted(() => {
    viewer = new JOYFUL3D.Viewer({ el: el.value, stats: true, axis: true, grid: true })
    scene = viewer.getScene()
    subscribe()
  })

  onUnmounted(() => {
    viewer.dispose()
  })

  const subscribe = () => {
    processMessage()
    processQueue()
  }

  const processMessage = () => {
    if (index >= max) return

    const currentPoint: pointType[] = []
    // 一次message，处理2000个点位
    for (let i = 0; i < 2000; i++) {
      const base = Math.random() * 1000

      const x = base * Math.random() - base / 2
      const y = base * Math.random() - base / 2
      const z = base * Math.random() - base / 2

      currentPoint.push({ x, y, z })
    }
    pointCloudQueue.push(currentPoint)

    index++

    setTimeout(() => {
      processMessage()
    }, 100)
  }

  const processQueue = () => {
    const requestId = requestAnimationFrame(processQueue)

    if (pointInstanceArray.length === 0 && pointCloudQueue.length === 0) {
      cancelAnimationFrame(requestId)
      return
    }

    const now = Date.now()

    if (pointInstanceArray.length) {
      if (now - pointInstanceArray[0].timestamps > decayTime) {
        const item = pointInstanceArray.shift()
        if (item) item.instance.dispose()
      }
    }

    if (pointCloudQueue.length) {
      if (now - lastRenderTime < throttleRate) return

      const points: pointType[] = pointCloudQueue.shift()!
      const instance = new JOYFUL3D.Points({ scene, maxPoints: maxPoints })
      pointInstanceArray.push({ instance, timestamps: Date.now() })

      // const r = Math.floor(Math.random() * 256) / 255;
      // const g = Math.floor(Math.random() * 256) / 255;
      // const b = Math.floor(Math.random() * 256) / 255;

      for (let i = 0; i < points.length; i++) {
        const { x, y, z } = points[i]

        instance.addPoint(x, y, z, 0, 0, 0)
      }
      lastRenderTime = now
    }
  }
}
