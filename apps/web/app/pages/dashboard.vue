<script setup lang="ts">
import type { AdminIconName } from '~/types/ui'

useHead({ title: 'Dashboard Overview · SmeFlow' })

const toast = useToast()

// Date range filter
const dateRangeText = ref('Jan 1, 2024 – Jan 31, 2024')
const revenueYear = ref('This Year')

// Stat Cards with Wave & Bar Gradients
const statCards = [
  {
    id: 'businesses',
    title: 'Total Businesses',
    value: '248',
    change: '↑ 12.5%',
    changeNote: 'from last month',
    icon: 'building' as const,
    colorTheme: 'indigo' as const,
  },
  {
    id: 'active',
    title: 'Active Businesses',
    value: '216',
    change: '↑ 8.2%',
    changeNote: 'from last month',
    icon: 'users' as const,
    colorTheme: 'emerald' as const,
  },
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: '$18,420',
    change: '↑ 18.4%',
    changeNote: 'from last month',
    icon: 'card' as const,
    colorTheme: 'amber' as const,
  },
  {
    id: 'users',
    title: 'Total Users',
    value: '1,284',
    change: '↑ 6.3%',
    changeNote: 'from last month',
    icon: 'users' as const,
    colorTheme: 'sky' as const,
  },
]

// Revenue Chart Bars data
const revenueBars = [
  { month: 'Jan', height: 42, active: false },
  { month: 'Feb', height: 50, active: false },
  { month: 'Mar', height: 45, active: false },
  { month: 'Apr', height: 58, active: false },
  { month: 'May', height: 52, active: false },
  { month: 'Jun', height: 68, active: false },
  { month: 'Jul', height: 62, active: false },
  { month: 'Aug', height: 85, active: true },
  { month: 'Sep', height: 72, active: false },
  { month: 'Oct', height: 88, active: true },
  { month: 'Nov', height: 95, active: false },
  { month: 'Dec', height: 80, active: false },
]

// Subscription Plans Donut
const subscriptionPlans = [
  { name: 'Pro', percent: 55, color: '#5b4cf5', dotClass: 'bg-[#5b4cf5]' },
  { name: 'Business', percent: 27, color: '#10b981', dotClass: 'bg-[#10b981]' },
  { name: 'Starter', percent: 18, color: '#f59e0b', dotClass: 'bg-[#f59e0b]' },
]

type ActivityItem = {
  id: number
  title: string
  subtitle: string
  time: string
  iconBg: string
  iconColor: string
  icon: AdminIconName
}

// Recent Activities
const activities: ActivityItem[] = [
  {
    id: 1,
    title: 'New business registered',
    subtitle: 'Sabaidee Coffee',
    time: '2 mins ago',
    iconBg: 'bg-violet-100/80',
    iconColor: 'text-violet-600',
    icon: 'building',
  },
  {
    id: 2,
    title: 'Subscription upgraded',
    subtitle: 'Mekong Mini Mart',
    time: '12 mins ago',
    iconBg: 'bg-emerald-100/80',
    iconColor: 'text-emerald-600',
    icon: 'card',
  },
  {
    id: 3,
    title: 'New user added',
    subtitle: 'somsaik@example.com',
    time: '1 hour ago',
    iconBg: 'bg-sky-100/80',
    iconColor: 'text-sky-600',
    icon: 'users',
  },
  {
    id: 4,
    title: 'Payment received',
    subtitle: '$99.00 from City Laundry',
    time: '2 hours ago',
    iconBg: 'bg-amber-100/80',
    iconColor: 'text-amber-600',
    icon: 'wallet',
  },
]

// Recent Businesses Table
const businesses = [
  {
    id: 1,
    name: 'Sabaidee Coffee',
    logoBg: 'bg-rose-50 text-rose-600 border border-rose-200',
    logoText: '☕',
    owner: 'Bounmy S.',
    category: 'Restaurant',
    plan: 'Pro',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Mekong Mini Mart',
    logoBg: 'bg-blue-50 text-blue-600 border border-blue-200',
    logoText: '🛒',
    owner: 'Manivanh K.',
    category: 'Retail',
    plan: 'Business',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Vientiane Service',
    logoBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    logoText: '🛠️',
    owner: 'Somphone V.',
    category: 'Services',
    plan: 'Starter',
    status: 'Pending',
  },
  {
    id: 4,
    name: 'Lao Fashion Store',
    logoBg: 'bg-slate-900 text-white',
    logoText: '👗',
    owner: 'Dala P.',
    category: 'Retail',
    plan: 'Pro',
    status: 'Inactive',
  },
  {
    id: 5,
    name: 'Green Farm Laos',
    logoBg: 'bg-teal-50 text-teal-600 border border-teal-200',
    logoText: '🌱',
    owner: 'Vieng S.',
    category: 'Agriculture',
    plan: 'Business',
    status: 'Active',
  },
]

// Top Categories with progress bars
const categories = [
  { name: 'Retail', percent: 35, colorClass: 'bg-[#7568ff]', iconBg: 'bg-violet-100/80 text-violet-600' },
  { name: 'Services', percent: 28, colorClass: 'bg-[#3b82f6]', iconBg: 'bg-blue-100/80 text-blue-600' },
  { name: 'Restaurant', percent: 20, colorClass: 'bg-[#f59e0b]', iconBg: 'bg-amber-100/80 text-amber-600' },
  { name: 'Agriculture', percent: 12, colorClass: 'bg-[#10b981]', iconBg: 'bg-emerald-100/80 text-emerald-600' },
  { name: 'Other', percent: 5, colorClass: 'bg-[#94a3b8]', iconBg: 'bg-slate-100 text-slate-500' },
]

// Table pagination
const currentPage = ref(1)

const onAddBusiness = () => {
  toast.info('ເປີດຟອມເພີ່ມທຸລະກິດໃໝ່')
}
</script>

<template>
  <div class="space-y-6">
    <!-- ========================================================= -->
    <!-- TOP HEADER: Greeting & Actions -->
    <!-- ========================================================= -->
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          Good morning, Admin 👋
        </h1>
        <p class="mt-0.5 text-xs font-medium text-slate-500">
          Here's what's happening with your SME platform today.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Date Range Filter Pill -->
        <button
          type="button"
          class="focus-ring flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <AdminIcon name="calendar" class="size-3.5 text-slate-400" />
          <span>{{ dateRangeText }}</span>
          <AdminIcon name="chevron-down" class="size-3 text-slate-400" />
        </button>

        <!-- Primary CTA: Add Business -->
        <button
          type="button"
          class="focus-ring flex h-9 items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-3.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition"
          @click="onAddBusiness"
        >
          <AdminIcon name="plus" class="size-3.5" />
          <span>Add Business</span>
        </button>
      </div>
    </header>

    <!-- ========================================================= -->
    <!-- ROW 1: 4 Stat Cards -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        v-for="card in statCards"
        :id="card.id"
        :key="card.id"
        :title="card.title"
        :value="card.value"
        :change="card.change"
        :change-note="card.changeNote"
        :icon="card.icon"
        :color-theme="card.colorTheme"
      />
    </section>

    <!-- ========================================================= -->
    <!-- ROW 2: Middle 3 Analytics & Activity Widgets -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- 1. Revenue Overview (Width: ~50% -> 6 cols) -->
      <article class="rounded-2xl border border-line bg-white p-5 shadow-card lg:col-span-6 flex flex-col justify-between">
        <header class="flex items-center justify-between pb-4">
          <h2 class="text-base font-extrabold text-slate-900">Revenue Overview</h2>
          <div class="w-32">
            <Select2
              v-model="revenueYear"
              :options="['This Year', 'Last Year']"
              :searchable="false"
              size="sm"
            />
          </div>
        </header>

        <!-- Revenue Chart Canvas (SVG line + bars) -->
        <div class="relative mt-2 pt-8">
          <!-- Floating Tooltip on August -->
          <div class="pointer-events-none absolute top-1 left-[64%] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-center text-white shadow-md z-10">
            <p class="text-xs font-extrabold">$24,580</p>
            <p class="text-[0.62rem] text-slate-300">Aug 2024</p>
            <span class="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-slate-900" />
          </div>

          <!-- Y-Axis + Grid Lines -->
          <div class="relative h-44 w-full">
            <div class="absolute inset-0 flex flex-col justify-between text-[0.65rem] font-bold text-slate-400">
              <div class="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                <span class="w-7 text-right">30K</span>
                <div class="flex-1" />
              </div>
              <div class="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                <span class="w-7 text-right">20K</span>
                <div class="flex-1" />
              </div>
              <div class="flex items-center gap-2 border-b border-dashed border-slate-100 pb-1">
                <span class="w-7 text-right">10K</span>
                <div class="flex-1" />
              </div>
              <div class="flex items-center gap-2">
                <span class="w-7 text-right">0</span>
                <div class="flex-1 border-b border-slate-100" />
              </div>
            </div>

            <!-- SVG Smooth Trend Line and Monthly Bars -->
            <svg viewBox="0 0 520 150" preserveAspectRatio="none" class="absolute inset-y-0 left-9 right-0 h-full w-[calc(100%-2.25rem)] overflow-visible">
              <!-- Soft Background Bars (Jan..Dec) -->
              <rect x="20" y="90" width="16" height="60" rx="4" fill="#ecebff" />
              <rect x="62" y="80" width="16" height="70" rx="4" fill="#ecebff" />
              <rect x="104" y="85" width="16" height="65" rx="4" fill="#ecebff" />
              <rect x="146" y="65" width="16" height="85" rx="4" fill="#ecebff" />
              <rect x="188" y="70" width="16" height="80" rx="4" fill="#ecebff" />
              <rect x="230" y="50" width="16" height="100" rx="4" fill="#ecebff" />
              <rect x="272" y="55" width="16" height="95" rx="4" fill="#ecebff" />
              <rect x="314" y="25" width="16" height="125" rx="4" fill="#5b4cf5" />
              <rect x="356" y="45" width="16" height="105" rx="4" fill="#ecebff" />
              <rect x="398" y="20" width="16" height="130" rx="4" fill="#5b4cf5" />
              <rect x="440" y="30" width="16" height="120" rx="4" fill="#ecebff" />
              <rect x="482" y="40" width="16" height="110" rx="4" fill="#ecebff" />

              <!-- Smooth Curve Line -->
              <path
                d="M 28 95 C 60 85, 80 82, 112 85 C 135 88, 160 68, 196 66 C 225 64, 255 48, 280 50 C 300 52, 310 22, 322 22 C 340 22, 380 48, 406 30 C 425 18, 435 22, 448 24 C 470 28, 480 35, 490 38"
                fill="none"
                stroke="#5b4cf5"
                stroke-width="2.5"
                stroke-linecap="round"
              />

              <!-- Point Circles -->
              <circle cx="28" cy="95" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="70" cy="88" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="112" cy="85" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="154" cy="74" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="196" cy="66" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="238" cy="56" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="280" cy="50" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="322" cy="22" r="4.5" fill="#5b4cf5" stroke="#fff" stroke-width="2.5" />
              <circle cx="364" cy="40" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="406" cy="30" r="4.5" fill="#5b4cf5" stroke="#fff" stroke-width="2.5" />
              <circle cx="448" cy="24" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
              <circle cx="490" cy="38" r="3.5" fill="#5b4cf5" stroke="#fff" stroke-width="2" />
            </svg>
          </div>

          <!-- X-Axis Months -->
          <div class="mt-2.5 flex justify-between pl-9 pr-1 text-[0.68rem] font-bold text-slate-400">
            <span v-for="bar in revenueBars" :key="bar.month">{{ bar.month }}</span>
          </div>
        </div>
      </article>

      <!-- 2. Subscription Plans Donut (Width: ~25% -> 3 cols) -->
      <article class="rounded-2xl border border-line bg-white p-5 shadow-card lg:col-span-3 flex flex-col justify-between">
        <header class="pb-2">
          <h2 class="text-base font-extrabold text-slate-900">Subscription Plans</h2>
        </header>

        <!-- Donut & Legend Container -->
        <div class="my-auto flex flex-col items-center gap-4 py-2 sm:flex-row sm:justify-around lg:flex-col xl:flex-row">
          <!-- Donut Graphic -->
          <div class="relative grid size-36 place-items-center">
            <svg viewBox="0 0 36 36" class="size-full -rotate-90">
              <!-- Background circle -->
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" stroke-width="4.5" />
              <!-- Pro: 55% -> stroke-dasharray 55 45 -->
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#5b4cf5"
                stroke-width="4.5"
                stroke-dasharray="55 45"
                stroke-dashoffset="0"
                stroke-linecap="round"
              />
              <!-- Business: 27% -> offset -55 -->
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#10b981"
                stroke-width="4.5"
                stroke-dasharray="27 73"
                stroke-dashoffset="-55"
              />
              <!-- Starter: 18% -> offset -82 -->
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#f59e0b"
                stroke-width="4.5"
                stroke-dasharray="18 82"
                stroke-dashoffset="-82"
              />
            </svg>
            <!-- Center Label -->
            <div class="absolute text-center">
              <span class="block text-2xl font-black text-slate-900 leading-none">248</span>
              <span class="mt-1 block text-[0.62rem] font-bold text-slate-400 uppercase tracking-wider">Businesses</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="space-y-2 text-xs">
            <div v-for="plan in subscriptionPlans" :key="plan.name" class="flex items-center justify-between gap-3 min-w-24">
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full" :class="plan.dotClass" />
                <span class="font-semibold text-slate-700">{{ plan.name }}</span>
              </div>
              <span class="font-bold text-slate-900">{{ plan.percent }}%</span>
            </div>
          </div>
        </div>
      </article>

      <!-- 3. Recent Activities (Width: ~25% -> 3 cols) -->
      <article class="rounded-2xl border border-line bg-white p-5 shadow-card lg:col-span-3 flex flex-col justify-between">
        <header class="flex items-center justify-between pb-3">
          <h2 class="text-base font-extrabold text-slate-900">Recent Activities</h2>
          <NuxtLink to="/settings/activity" class="text-xs font-bold text-brand-600 hover:text-brand-700">
            View All →
          </NuxtLink>
        </header>

        <ul class="divide-y divide-slate-100 my-auto">
          <li
            v-for="item in activities"
            :key="item.id"
            class="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span class="grid size-8 shrink-0 place-items-center rounded-xl" :class="[item.iconBg, item.iconColor]">
              <AdminIcon :name="item.icon" class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <p class="truncate text-xs font-extrabold text-slate-900 leading-snug">{{ item.title }}</p>
                <span class="shrink-0 text-[0.62rem] font-medium text-slate-400">{{ item.time }}</span>
              </div>
              <p class="truncate text-[0.68rem] font-medium text-slate-500">{{ item.subtitle }}</p>
            </div>
          </li>
        </ul>
      </article>
    </section>

    <!-- ========================================================= -->
    <!-- ROW 3: Recent Businesses & Top Categories / Quick Actions -->
    <!-- ========================================================= -->
    <section class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- 1. Recent Businesses Table (Col: 8) -->
      <article class="rounded-2xl border border-line bg-white p-5 shadow-card lg:col-span-8 flex flex-col justify-between overflow-hidden">
        <header class="flex items-center justify-between pb-4">
          <h2 class="text-base font-extrabold text-slate-900">Recent Businesses</h2>
          <NuxtLink to="/settings/business" class="text-xs font-bold text-brand-600 hover:text-brand-700">
            View All →
          </NuxtLink>
        </header>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-100 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">
                <th class="pb-3 pl-1 w-8">#</th>
                <th class="pb-3">BUSINESS</th>
                <th class="pb-3">OWNER</th>
                <th class="pb-3">CATEGORY</th>
                <th class="pb-3">PLAN</th>
                <th class="pb-3">STATUS</th>
                <th class="pb-3 pr-1 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="b in businesses"
                :key="b.id"
                class="transition hover:bg-slate-50/70"
              >
                <td class="py-3 pl-1 font-bold text-slate-400">{{ b.id }}</td>
                <!-- Business Logo + Name -->
                <td class="py-3">
                  <div class="flex items-center gap-2.5">
                    <span class="grid size-7.5 shrink-0 place-items-center rounded-lg text-xs" :class="b.logoBg">
                      {{ b.logoText }}
                    </span>
                    <span class="font-extrabold text-slate-900">{{ b.name }}</span>
                  </div>
                </td>
                <td class="py-3 text-slate-600 font-medium">{{ b.owner }}</td>
                <td class="py-3 text-slate-600 font-medium">{{ b.category }}</td>
                <td class="py-3 font-extrabold text-slate-900">{{ b.plan }}</td>
                <td class="py-3">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold"
                    :class="b.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                      : b.status === 'Pending'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                        : 'bg-slate-100 text-slate-500 border border-slate-200/80'"
                  >
                    {{ b.status }}
                  </span>
                </td>
                <!-- Actions -->
                <td class="py-3 pr-1 text-right">
                  <div class="flex items-center justify-end gap-1 text-slate-400">
                    <button type="button" class="grid size-7 place-items-center rounded-lg hover:bg-slate-100 hover:text-slate-700" title="Edit">
                      <AdminIcon name="edit" class="size-3.5" />
                    </button>
                    <button type="button" class="grid size-7 place-items-center rounded-lg hover:bg-slate-100 hover:text-slate-700" title="View Details">
                      <AdminIcon name="eye" class="size-3.5" />
                    </button>
                    <button type="button" class="grid size-7 place-items-center rounded-lg hover:bg-slate-100 hover:text-slate-700" title="More">
                      <AdminIcon name="more" class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Footer Pagination -->
        <footer class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs text-slate-400 font-medium">
          <p>Showing 1 to 5 of 48 results</p>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="grid size-7 place-items-center rounded-lg border border-line bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
              :disabled="currentPage <= 1"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              <AdminIcon name="chevron-left" class="size-3.5" />
            </button>
            <button
              v-for="p in [1, 2, 3, 4, 5]"
              :key="p"
              type="button"
              class="grid size-7 place-items-center rounded-lg font-bold text-xs transition"
              :class="currentPage === p ? 'bg-[#5b4cf5] text-white shadow-xs' : 'border border-line bg-white text-slate-700 hover:bg-slate-50'"
              @click="currentPage = p"
            >
              {{ p }}
            </button>
            <button
              type="button"
              class="grid size-7 place-items-center rounded-lg border border-line bg-white hover:bg-slate-50 text-slate-600"
              @click="currentPage = Math.min(5, currentPage + 1)"
            >
              <AdminIcon name="chevron-right" class="size-3.5" />
            </button>
          </div>
        </footer>
      </article>

      <!-- 2. Right Column: Top Categories & Quick Actions (Col: 4) -->
      <div class="space-y-5 lg:col-span-4 flex flex-col justify-between">
        <!-- Top Categories Card -->
        <article class="rounded-2xl border border-line bg-white p-5 shadow-card">
          <header class="flex items-center justify-between pb-3">
            <h2 class="text-base font-extrabold text-slate-900">Top Categories</h2>
            <NuxtLink to="/products" class="text-xs font-bold text-brand-600 hover:text-brand-700">
              View All →
            </NuxtLink>
          </header>

          <div class="space-y-3 pt-1">
            <div
              v-for="cat in categories"
              :key="cat.name"
              class="flex items-center gap-3"
            >
              <span class="grid size-6.5 shrink-0 place-items-center rounded-lg text-xs" :class="cat.iconBg">
                <AdminIcon name="tag" class="size-3" />
              </span>
              <span class="w-20 truncate text-xs font-bold text-slate-700">{{ cat.name }}</span>
              <!-- Horizontal Progress Bar -->
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="cat.colorClass"
                  :style="{ width: `${cat.percent}%` }"
                />
              </div>
              <span class="w-8 text-right text-xs font-extrabold text-slate-600">{{ cat.percent }}%</span>
            </div>
          </div>
        </article>

        <!-- Quick Actions Card -->
        <article class="rounded-2xl border border-line bg-white p-5 shadow-card">
          <header class="pb-3">
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-800">Quick Actions</h2>
          </header>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <!-- Action 1: Add Business -->
            <button
              type="button"
              class="focus-ring flex flex-col items-center justify-center gap-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-center transition hover:bg-violet-100 hover:border-violet-200"
              @click="onAddBusiness"
            >
              <span class="grid size-8 place-items-center rounded-lg bg-[#5b4cf5] text-white shadow-xs">
                <AdminIcon name="plus" class="size-4" />
              </span>
              <span class="text-[0.68rem] font-bold text-violet-900 leading-tight">Add Business</span>
            </button>

            <!-- Action 2: Add User -->
            <button
              type="button"
              class="focus-ring flex flex-col items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-center transition hover:bg-sky-100 hover:border-sky-200"
              @click="toast.info('ເປີດຟອມເພີ່ມຜູ້ໃຊ້ງານ')"
            >
              <span class="grid size-8 place-items-center rounded-lg bg-sky-600 text-white shadow-xs">
                <AdminIcon name="users" class="size-4" />
              </span>
              <span class="text-[0.68rem] font-bold text-sky-900 leading-tight">Add User</span>
            </button>

            <!-- Action 3: Create Plan -->
            <button
              type="button"
              class="focus-ring flex flex-col items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-center transition hover:bg-amber-100 hover:border-amber-200"
              @click="toast.info('ເປີດຟອມສ້າງແຜນ Subscription')"
            >
              <span class="grid size-8 place-items-center rounded-lg bg-amber-500 text-white shadow-xs">
                <AdminIcon name="card" class="size-4" />
              </span>
              <span class="text-[0.68rem] font-bold text-amber-900 leading-tight">Create Plan</span>
            </button>

            <!-- Action 4: View Reports -->
            <button
              type="button"
              class="focus-ring flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-center transition hover:bg-emerald-100 hover:border-emerald-200"
              @click="toast.info('ເປີດໜ້າລາຍງານສະຫຼຸບ')"
            >
              <span class="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <AdminIcon name="chart" class="size-4" />
              </span>
              <span class="text-[0.68rem] font-bold text-emerald-900 leading-tight">View Reports</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
