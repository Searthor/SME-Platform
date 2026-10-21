<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), {
  compact: false,
  inverse: false,
})
</script>

<template>
  <div class="inline-flex items-center gap-2.5" aria-label="SmeFlow">
    <span
      class="grid size-9.5 shrink-0 place-items-center rounded-xl font-black text-lg text-white shadow-md shadow-[#5b4cf5]/20 bg-gradient-to-br from-[#7568ff] to-[#4a3bd9]"
      aria-hidden="true"
    >
      <span class="tracking-tight font-extrabold">S</span>
    </span>
    <span v-if="!compact" class="leading-none">
      <span class="block text-base font-extrabold tracking-tight" :class="inverse ? 'text-white' : 'text-ink-950'">SmeFlow</span>
      <span class="mt-1 block text-[0.55rem] font-bold tracking-[0.12em] uppercase" :class="inverse ? 'text-white/45' : 'text-ink-500'">Business Platform</span>
    </span>
  </div>
</template>
