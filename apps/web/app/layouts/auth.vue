<template>
  <main class="relative min-h-screen overflow-hidden bg-canvas">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute -top-40 -left-28 size-[36rem] rounded-full bg-[#5b4cf5]/8 blur-[100px]" />
      <div class="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-[#7568ff]/10 blur-[100px]" />
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 size-[44rem] rounded-full bg-[#101232]/[0.03] blur-[120px]" />
      <svg class="absolute top-0 right-0 h-full w-[56%] opacity-[0.025]" viewBox="0 0 800 900" fill="none">
        <path d="M50 50 750 850M250-20 800 530M0 350 550 900" stroke="#5b4cf5" stroke-width="1.5" />
        <circle cx="570" cy="270" r="180" stroke="#5b4cf5" stroke-width="1.5" />
        <circle cx="570" cy="270" r="110" stroke="#5b4cf5" stroke-width="1.5" />
      </svg>
    </div>
    <slot />
  </main>
</template>
