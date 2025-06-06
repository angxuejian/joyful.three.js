<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { usePointCloud2 } from '@/hooks'

const threeRef: Ref = ref()
usePointCloud2({ el: threeRef })

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
