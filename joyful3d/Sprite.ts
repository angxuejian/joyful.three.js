import * as THREE from 'three'

export interface SpriteOptionsType {
  text: string;
  position: THREE.Vector3;
  scene?: THREE.Scene;

}


/**
 * Sprite 2d文本渲染类
 *
 * 用于在 THREE.js 场景中渲染带有文本的精灵，支持自适应文本大小和清晰度优化。
 *
 * 主要功能：
 * - 通过 Canvas 动态绘制文本生成纹理
 * - 支持高分屏（devicePixelRatio）防止模糊
 * - 自动计算精灵的宽高比例，适配 THREE.js 世界单位
 * - 支持自定义文本内容和位置
 * - 构造时自动添加到指定场景中
 *
 * 构造参数 SpriteOptionsType:
 * @param text      要显示的文本内容
 * @param position  THREE.Vector3 类型，精灵在场景中的位置
 * @param scene     THREE.Scene 实例，可选，精灵会自动添加到该场景
 */
export default class Sprite {
  private text: string
  private position: THREE.Vector3
  private scene: THREE.Scene | undefined
  private scaleX: number = 0
  private scaleY: number = 0

  constructor(private options: SpriteOptionsType) {
    this.text = this.options.text
    this.position = this.options.position
    this.scene = this.options.scene

    const spriteMaterial = this.createMaterial()

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(this.scaleX, this.scaleY, 1)
    sprite.position.copy(this.position)

    this.scene?.add(sprite)
  }

  private createMaterial(): THREE.SpriteMaterial {
    const map = this.createMap()
    const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff } );

    return material
  }

  private createMap(): THREE.Texture {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1;

    const fontsize = 40
    const metrics = ctx.measureText(this.text);
    const textWidth = metrics.width;
    const padding = 20;

    const width = (textWidth + padding) * 2;
    const height = fontsize * 1.5;

    const x = width / 2;
    const y = height / 2;

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = canvas.width + 'px'
    canvas.style.height = canvas.height + 'px'
    ctx.scale(dpr, dpr)


    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontsize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff0000';
    ctx.fillText(this.text, x, y)

    const texture = new THREE.CanvasTexture(canvas);
    // const texture = new THREE.TextureLoader().load(canvas.toDataURL('image/png'));
    texture.needsUpdate = true;
    texture.generateMipmaps = false;

    /**
     * 因为 THREE.Sprite 是一个三维对象，而 canvas.width 和 canvas.height 是像素单位（通常几十到几百像素），如果直接使用它们作为 3D 世界中的尺寸，会导致文本看起来超级大
     * 所以乘以 scaleFactor 是为了将像素单位缩放为 Three.js 世界单位
     */
    const scaleFactor = 0.01
    this.scaleX = width * scaleFactor
    this.scaleY = height * scaleFactor
    return texture
  }
}
