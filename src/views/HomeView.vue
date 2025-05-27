<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import { useThreejs } from '../hooks/use-threejs';
import { usePoints } from '../hooks/use-points'

const threeRef: Ref = ref()

const { add } = useThreejs({ elRef: threeRef, axis: true, stats: true, grid: false })
const { addPoint, updatePoint } = usePoints({ add, alpha: true, decayTime: 5_000 })

let i = 0
onMounted(() => {
  setInterval(() => {
    run()
  }, 1000);
})

const run = () => {
  addPoint(i, 0, 0, 1, 0, 0)
  addPoint(0, i, 0, 0, 1, 0)
  addPoint(0, 0, i, 0, 0, 1)

  i += 0.1

  updatePoint()
}

</script>

<template>
  <div ref="threeRef" id="three-container"></div>
</template>


<style scoped>
#three-container {
  width: 100%;
  height: 100%;
}
</style>
