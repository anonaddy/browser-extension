<template>
  <div
    v-if="showModal"
    class="fixed inset-0 flex justify-center"
    :class="overflow ? 'overflow-auto' : 'items-center'"
  >
    <transition
      @before-leave="backdropLeaving = true"
      @after-leave="backdropLeaving = false"
      enter-active-class="transition-all transition-fast ease-out-quad"
      leave-active-class="transition-all transition-medium ease-in-quad"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      appear
    >
      <div v-if="showBackdrop">
        <div
          class="inset-0 bg-black opacity-40"
          :class="overflow ? 'fixed pointer-events-none' : 'absolute'"
          @click="close"
        ></div>
      </div>
    </transition>

    <transition
      @before-leave="cardLeaving = true"
      @after-leave="cardLeaving = false"
      enter-active-class="transition-all transition-fast ease-out-quad"
      leave-active-class="transition-all transition-medium ease-in-quad"
      enter-from-class="opacity-0 scale-70"
      enter-to-class="opacity-100 scale-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-70"
      appear
    >
      <div v-if="showContent" class="relative">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  overflow: {
    type: Boolean,
    required: false,
    default: false,
  },
})
const emit = defineEmits(['close'])

const showModal = ref(false)
const showBackdrop = ref(false)
const showContent = ref(false)
const backdropLeaving = ref(false)
const cardLeaving = ref(false)

const leaving = computed(() => backdropLeaving.value || cardLeaving.value)

function show() {
  showModal.value = true
  showBackdrop.value = true
  showContent.value = true
}
function close() {
  showBackdrop.value = false
  showContent.value = false
}

watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      show()
    } else {
      close()
    }
  },
  { immediate: true }
)

watch(leaving, (newValue) => {
  if (newValue === false) {
    showModal.value = false
    emit('close')
  }
})

function onEscape(e) {
  if (props.open && e.keyCode === 27) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEscape)
})
</script>

<style>
.origin-top-right {
  transform-origin: top right;
}
.transition-all {
  transition-property: all;
}
.transition-fastest {
  transition-duration: 50ms;
}
.transition-faster {
  transition-duration: 100ms;
}
.transition-fast {
  transition-duration: 150ms;
}
.transition-medium {
  transition-duration: 200ms;
}
.ease-out-quad {
  transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.ease-in-quad {
  transition-timing-function: cubic-bezier(0.55, 0.085, 0.68, 0.53);
}
.scale-70 {
  transform: scale(0.7);
}
.scale-100 {
  transform: scale(1);
}
</style>
